#!/usr/bin/env python3
"""
Positional Index Builder using Apache Spark
Connects to PostgreSQL and builds a positional index for all documents
"""

from pyspark.sql import SparkSession
from pyspark.sql.functions import col, udf, explode
from pyspark.sql.types import ArrayType, IntegerType, StringType, StructType, StructField
import os
import re
from Crypto.Cipher import AES
import psycopg2
from psycopg2.extras import execute_values

# Database configuration (Docker host access)
DB_CONFIG = {
    'host': 'host.docker.internal',  # Access host machine from Docker
    'port': 5432,
    'database': 'ir_system',
    'user': 'postgres',
    'password': '107090'  # Update this with your actual password
}


def normalize_key(key_value: str) -> bytes:
    """Normalize encryption key to 32 bytes (AES-256 requirement)."""
    key_bytes = key_value.encode('utf-8')
    if len(key_bytes) < 32:
        key_bytes = key_bytes.ljust(32, b'0')
    return key_bytes[:32]


def decrypt_document(encrypted_hex: str, iv_hex: str, auth_tag_hex: str, key_bytes: bytes) -> str:
    """Decrypt AES-256-GCM payload stored as hex strings."""
    if not encrypted_hex or not iv_hex or not auth_tag_hex:
        return ''

    cipher = AES.new(key_bytes, AES.MODE_GCM, nonce=bytes.fromhex(iv_hex))
    cipher.update(b'')
    plaintext = cipher.decrypt_and_verify(bytes.fromhex(encrypted_hex), bytes.fromhex(auth_tag_hex))
    return plaintext.decode('utf-8')

def tokenize_text(text):
    """
    Tokenize text into lowercase alphanumeric words
    Returns list of tokens
    """
    if not text:
        return []
    # Extract alphanumeric words and convert to lowercase
    tokens = re.findall(r'[a-z0-9]+', text.lower())
    return tokens

def build_positional_index(text):
    """
    Build positional index for a single document
    Returns list of (term, positions) tuples
    """
    if not text:
        return []
    
    tokens = tokenize_text(text)
    term_positions = {}
    
    for position, token in enumerate(tokens):
        if token not in term_positions:
            term_positions[token] = []
        term_positions[token].append(position)
    
    # Convert to list of tuples
    result = [(term, positions) for term, positions in term_positions.items()]
    return result

def main():
    print("=" * 80)
    print("POSITIONAL INDEX BUILDER - Apache Spark")
    print("=" * 80)
    
    encryption_key = os.getenv('ENCRYPTION_KEY')
    if not encryption_key:
        raise RuntimeError('ENCRYPTION_KEY environment variable is required to decrypt documents.')

    aes_key = normalize_key(encryption_key)

    # Create Spark session
    spark = SparkSession.builder \
        .appName("PositionalIndexBuilder") \
        .config("spark.driver.memory", "2g") \
        .getOrCreate()
    
    print(f"✅ Spark session created: {spark.version}")
    
    try:
        # Connect to PostgreSQL and read documents
        print(f"\n📡 Connecting to PostgreSQL at {DB_CONFIG['host']}:{DB_CONFIG['port']}...")
        
        jdbc_url = f"jdbc:postgresql://{DB_CONFIG['host']}:{DB_CONFIG['port']}/{DB_CONFIG['database']}"
        
        documents_df = spark.read \
            .format("jdbc") \
            .option("url", jdbc_url) \
            .option("dbtable", "documents") \
            .option("user", DB_CONFIG['user']) \
            .option("password", DB_CONFIG['password']) \
            .option("driver", "org.postgresql.Driver") \
            .load()
        
        doc_count = documents_df.count()
        print(f"✅ Loaded {doc_count} documents from database")
        
        if doc_count == 0:
            print("⚠️  No documents found. Please upload documents first.")
            spark.stop()
            return
        
        # Select necessary columns
        def decrypt_with_key(encrypted, iv_value, auth_tag_value):
            try:
                return decrypt_document(encrypted, iv_value, auth_tag_value, aes_key)
            except Exception as exc:
                raise RuntimeError(f"Failed to decrypt document: {exc}") from exc

        decrypt_udf = udf(decrypt_with_key, StringType())

        decrypted_docs = documents_df.select(
            "doc_id",
            decrypt_udf(col("encrypted_content"), col("iv"), col("auth_tag")).alias("content")
        )

        docs = decrypted_docs.filter(col("content").isNotNull() & (col("content") != ""))

        processed_count = docs.count()
        print(f"📄 Successfully decrypted {processed_count} documents for indexing")

        if processed_count == 0:
            print("⚠️  No decryptable documents found. Please upload documents first.")
            spark.stop()
            return
        
        # Register UDF for building positional index
        build_index_udf = udf(build_positional_index, ArrayType(StructType([
            StructField("term", StringType(), False),
            StructField("positions", ArrayType(IntegerType()), False)
        ])))
        
        # Build positional index for each document
        print("\n🔨 Building positional index...")
        indexed_df = docs.withColumn("index", build_index_udf(col("content")))
        
        # Explode to get one row per term-document pair
        exploded_df = indexed_df.select(
            col("doc_id"),
            explode(col("index")).alias("term_data")
        ).select(
            col("doc_id"),
            col("term_data.term").alias("term"),
            col("term_data.positions").alias("positions")
        )
        
        # Collect results
        index_data = exploded_df.collect()
        
        print(f"✅ Built index with {len(index_data)} term-document pairs")
        
        # Connect to PostgreSQL to store results
        print("\n💾 Storing positional index in database...")
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        # Clear existing index
        cursor.execute("DELETE FROM positional_index")
        print("   Cleared existing index")
        
        # Prepare data for insertion
        insert_data = [(row.term, row.doc_id, row.positions) for row in index_data]
        
        # Batch insert
        execute_values(
            cursor,
            """
            INSERT INTO positional_index (term, doc_id, positions) 
            VALUES %s
            ON CONFLICT (term, doc_id) DO UPDATE 
            SET positions = EXCLUDED.positions
            """,
            insert_data,
            page_size=1000
        )
        
        conn.commit()
        print(f"✅ Inserted {len(insert_data)} entries into positional_index table")
        
        # Get statistics
        cursor.execute("SELECT COUNT(DISTINCT term) FROM positional_index")
        unique_terms = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(DISTINCT doc_id) FROM positional_index")
        unique_docs = cursor.fetchone()[0]
        
        print(f"\n📊 Index Statistics:")
        print(f"   Total unique terms: {unique_terms}")
        print(f"   Total documents indexed: {unique_docs}")
        print(f"   Total term-document pairs: {len(insert_data)}")
        
        # Show sample entries
        print(f"\n📋 Sample index entries:")
        cursor.execute("""
            SELECT term, doc_id, positions 
            FROM positional_index 
            ORDER BY term, doc_id 
            LIMIT 10
        """)
        
        for term, doc_id, positions in cursor.fetchall():
            positions_str = ', '.join(map(str, positions[:10]))
            if len(positions) > 10:
                positions_str += ', ...'
            print(f"   {term}: {doc_id} -> [{positions_str}]")
        
        cursor.close()
        conn.close()
        
        print("\n" + "=" * 80)
        print("✅ POSITIONAL INDEX BUILD COMPLETED SUCCESSFULLY")
        print("=" * 80)
        
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        spark.stop()
        print("\n🛑 Spark session stopped")

if __name__ == "__main__":
    main()

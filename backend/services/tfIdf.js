import { query } from "../config/db.js";

/**
 * Natural sort for document IDs (doc1, doc2, ..., doc10)
 * @param {string} a - First doc ID
 * @param {string} b - Second doc ID
 * @returns {number} Sort order
 */
const naturalSortDocIds = (a, b) => {
	const numA = parseInt(a.replace("doc", ""));
	const numB = parseInt(b.replace("doc", ""));
	return numA - numB;
};

/**
 * Calculate Term Frequency (TF) matrix
 * Formula: tf(t,d) = 1 + log10(frequency) if frequency > 0, else 0
 * @returns {Promise<Object>} TF matrix { term: { doc_id: tf_value } }
 */
export const calculateTermFrequency = async () => {
	try {
		// Get all terms and their positions from positional index
		const result = await query(
			`SELECT term, doc_id, positions 
       FROM positional_index 
       ORDER BY term, doc_id`
		);

		const tfMatrix = {};
		const documents = new Set();

		for (const row of result.rows) {
			const term = row.term;
			const docId = row.doc_id;
			const frequency = row.positions.length; // Number of positions = frequency

			documents.add(docId);

			if (!tfMatrix[term]) {
				tfMatrix[term] = {};
			}

			// Apply TF formula: 1 + log10(frequency)
			tfMatrix[term][docId] = frequency > 0 ? 1 + Math.log10(frequency) : 0;
		}

		return {
			matrix: tfMatrix,
			documents: Array.from(documents).sort(naturalSortDocIds),
			terms: Object.keys(tfMatrix).sort()
		};
	} catch (error) {
		console.error("Error calculating term frequency:", error);
		throw error;
	}
};

/**
 * Calculate Inverse Document Frequency (IDF)
 * Formula: idf(t) = log10(N / df) where N = total docs, df = doc frequency
 * @returns {Promise<Object>} IDF values { term: idf_value }
 */
export const calculateIDF = async () => {
	try {
		// Get total number of documents
		const docCountResult = await query(
			"SELECT COUNT(DISTINCT doc_id) as total FROM documents"
		);
		const N = parseInt(docCountResult.rows[0].total);

		if (N === 0) {
			return { idf: {}, totalDocuments: 0 };
		}

		// Get document frequency for each term
		const result = await query(
			`SELECT term, COUNT(DISTINCT doc_id) as df 
       FROM positional_index 
       GROUP BY term`
		);

		const idf = {};

		for (const row of result.rows) {
			const term = row.term;
			const df = parseInt(row.df);

			// Apply IDF formula: log10(N / df)
			idf[term] = Math.log10(N / df);
		}

		return {
			idf,
			totalDocuments: N
		};
	} catch (error) {
		console.error("Error calculating IDF:", error);
		throw error;
	}
};

/**
 * Calculate TF-IDF matrix
 * Formula: tfidf(t,d) = tf(t,d) * idf(t)
 * @returns {Promise<Object>} TF-IDF matrix
 */
export const calculateTFIDF = async () => {
	try {
		const {
			matrix: tfMatrix,
			documents,
			terms
		} = await calculateTermFrequency();
		const { idf } = await calculateIDF();

		const tfidfMatrix = {};

		for (const term of terms) {
			tfidfMatrix[term] = {};

			for (const docId of documents) {
				const tf = tfMatrix[term][docId] || 0;
				const idfValue = idf[term] || 0;

				tfidfMatrix[term][docId] = tf * idfValue;
			}
		}

		return {
			matrix: tfidfMatrix,
			documents,
			terms
		};
	} catch (error) {
		console.error("Error calculating TF-IDF:", error);
		throw error;
	}
};

/**
 * Calculate normalized TF-IDF matrix
 * Normalize by dividing each value by the document vector length (Euclidean norm)
 * @returns {Promise<Object>} Normalized TF-IDF matrix
 */
export const calculateNormalizedTFIDF = async () => {
	try {
		const { matrix: tfidfMatrix, documents, terms } = await calculateTFIDF();

		// Calculate document vector lengths
		const docLengths = {};

		for (const docId of documents) {
			let sumOfSquares = 0;

			for (const term of terms) {
				const tfidf = tfidfMatrix[term][docId] || 0;
				sumOfSquares += tfidf * tfidf;
			}

			docLengths[docId] = Math.sqrt(sumOfSquares);
		}

		// Normalize TF-IDF values
		const normalizedMatrix = {};

		for (const term of terms) {
			normalizedMatrix[term] = {};

			for (const docId of documents) {
				const tfidf = tfidfMatrix[term][docId] || 0;
				const docLength = docLengths[docId];

				// Avoid division by zero
				normalizedMatrix[term][docId] = docLength > 0 ? tfidf / docLength : 0;
			}
		}

		return {
			matrix: normalizedMatrix,
			documents,
			terms,
			docLengths
		};
	} catch (error) {
		console.error("Error calculating normalized TF-IDF:", error);
		throw error;
	}
};

/**
 * Get TF-IDF vector for a specific document
 * @param {string} docId - Document ID
 * @returns {Promise<Object>} Document TF-IDF vector
 */
export const getDocumentTFIDFVector = async (docId) => {
	try {
		const { matrix } = await calculateNormalizedTFIDF();

		const vector = {};

		for (const term in matrix) {
			if (matrix[term][docId]) {
				vector[term] = matrix[term][docId];
			}
		}

		return vector;
	} catch (error) {
		console.error("Error getting document TF-IDF vector:", error);
		throw error;
	}
};

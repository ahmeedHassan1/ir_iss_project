import { query } from '../config/db.js';
import { encryptDocument, decryptDocument } from '../services/encryptionService.js';
import { generateContentHash } from '../services/hashingService.js';
import { countWords } from '../utils/textProcessor.js';
import { logAction } from '../middleware/auditLogger.js';
import fs from 'fs/promises';
import path from 'path';

/**
 * Upload documents with encryption (ISS Requirement: Encryption)
 */
export const uploadDocuments = async (req, res) => {
  try {
    const files = req.files;
    const userId = req.user.id;
    const uploadedDocs = [];
    
    // Get existing document count to generate doc IDs
    const countResult = await query('SELECT COUNT(*) as count FROM documents');
    let docCounter = parseInt(countResult.rows[0].count) + 1;
    
    for (const file of files) {
      // Read file content
      const content = await fs.readFile(file.path, 'utf-8');
      
      // Generate document ID
      const docId = `doc${docCounter}`;
      docCounter++;
      
      // Calculate word count
      const wordCount = countWords(content);
      
      // Generate content hash for integrity (ISS Requirement: Hashing)
      const contentHash = generateContentHash(content);
      
      // Encrypt content (ISS Requirement: AES-256-GCM Encryption)
      const { encryptedContent, iv, authTag } = encryptDocument(content);
      
      // Store in database
      const result = await query(
        `INSERT INTO documents 
         (doc_id, filename, content, encrypted_content, iv, auth_tag, content_hash, word_count, uploaded_by, is_encrypted) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true) 
         RETURNING id, doc_id, filename, word_count, upload_date`,
        [docId, file.originalname, content, encryptedContent, iv, authTag, contentHash, wordCount, userId]
      );
      
      uploadedDocs.push(result.rows[0]);
      
      // Delete temporary file
      await fs.unlink(file.path);
    }
    
    await logAction(req, 'UPLOAD', 'SUCCESS', { 
      count: uploadedDocs.length, 
      docIds: uploadedDocs.map(d => d.doc_id) 
    });
    
    res.status(201).json({
      success: true,
      message: `${uploadedDocs.length} document(s) uploaded successfully`,
      data: { documents: uploadedDocs }
    });
  } catch (error) {
    console.error('Upload error:', error);
    await logAction(req, 'UPLOAD', 'FAILED', { error: error.message });
    
    // Clean up files on error
    if (req.files) {
      for (const file of req.files) {
        try {
          await fs.unlink(file.path);
        } catch (e) {
          console.error('Error deleting temp file:', e);
        }
      }
    }
    
    res.status(500).json({
      success: false,
      message: 'Upload failed',
      error: error.message
    });
  }
};

/**
 * Get all documents (without decrypting content)
 */
export const getDocuments = async (req, res) => {
  try {
    const result = await query(
      `SELECT d.id, d.doc_id, d.filename, d.word_count, d.upload_date, d.is_encrypted,
              u.username as uploaded_by_username
       FROM documents d
       LEFT JOIN users u ON d.uploaded_by = u.id
       ORDER BY d.upload_date DESC`
    );
    
    res.json({
      success: true,
      data: { documents: result.rows }
    });
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve documents',
      error: error.message
    });
  }
};

/**
 * Get a single document (with decrypted content)
 */
export const getDocument = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await query(
      `SELECT d.*, u.username as uploaded_by_username
       FROM documents d
       LEFT JOIN users u ON d.uploaded_by = u.id
       WHERE d.doc_id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }
    
    const doc = result.rows[0];
    
    // Decrypt content if encrypted
    let content = doc.content;
    if (doc.is_encrypted && doc.encrypted_content) {
      try {
        content = decryptDocument(doc.encrypted_content, doc.iv, doc.auth_tag);
      } catch (decryptError) {
        console.error('Decryption error:', decryptError);
        return res.status(500).json({
          success: false,
          message: 'Failed to decrypt document'
        });
      }
    }
    
    res.json({
      success: true,
      data: {
        document: {
          id: doc.id,
          doc_id: doc.doc_id,
          filename: doc.filename,
          content,
          word_count: doc.word_count,
          upload_date: doc.upload_date,
          uploaded_by_username: doc.uploaded_by_username,
          is_encrypted: doc.is_encrypted
        }
      }
    });
  } catch (error) {
    console.error('Get document error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve document',
      error: error.message
    });
  }
};

/**
 * Delete a document
 */
export const deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await query(
      'DELETE FROM documents WHERE doc_id = $1 RETURNING doc_id, filename',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }
    
    await logAction(req, 'DELETE', 'SUCCESS', { docId: id });
    
    res.json({
      success: true,
      message: 'Document deleted successfully',
      data: { document: result.rows[0] }
    });
  } catch (error) {
    console.error('Delete document error:', error);
    await logAction(req, 'DELETE', 'FAILED', { docId: req.params.id, error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to delete document',
      error: error.message
    });
  }
};

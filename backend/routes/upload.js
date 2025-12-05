import express from 'express';
import multer from 'multer';
import path from 'path';
import { uploadDocuments, getDocuments, getDocument, deleteDocument } from '../controllers/uploadController.js';
import { verifyToken } from '../middleware/auth.js';
import { validateFileUpload, validateDocId } from '../middleware/validator.js';
import { rateLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, process.env.UPLOAD_DIR || './uploads');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760 // 10MB
  },
  fileFilter: (req, file, cb) => {
    if (file.originalname.endsWith('.txt')) {
      cb(null, true);
    } else {
      cb(new Error('Only .txt files are allowed'));
    }
  }
});

/**
 * @route   POST /api/documents
 * @desc    Upload one or more documents
 * @access  Private
 */
router.post('/', 
  verifyToken, 
  rateLimiter(20, 1),
  upload.array('files', 10), 
  validateFileUpload, 
  uploadDocuments
);

/**
 * @route   GET /api/documents
 * @desc    Get all documents
 * @access  Private
 */
router.get('/', verifyToken, getDocuments);

/**
 * @route   GET /api/documents/:id
 * @desc    Get a single document (decrypted)
 * @access  Private
 */
router.get('/:id', verifyToken, validateDocId, getDocument);

/**
 * @route   DELETE /api/documents/:id
 * @desc    Delete a document
 * @access  Private
 */
router.delete('/:id', verifyToken, validateDocId, rateLimiter(10, 1), deleteDocument);

export default router;

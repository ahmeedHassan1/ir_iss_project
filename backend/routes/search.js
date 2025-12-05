import express from 'express';
import { getTermFrequency, getIDF, getTFIDFMatrix, getNormalizedTFIDF, search } from '../controllers/searchController.js';
import { verifyToken } from '../middleware/auth.js';
import { validateSearch } from '../middleware/validator.js';
import { sanitizeInput } from '../middleware/sanitizer.js';
import { rateLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

/**
 * @route   GET /api/search/tf
 * @desc    Get term frequency matrix
 * @access  Private
 */
router.get('/tf', verifyToken, getTermFrequency);

/**
 * @route   GET /api/search/idf
 * @desc    Get IDF values
 * @access  Private
 */
router.get('/idf', verifyToken, getIDF);

/**
 * @route   GET /api/search/tfidf
 * @desc    Get TF-IDF matrix
 * @access  Private
 */
router.get('/tfidf', verifyToken, getTFIDFMatrix);

/**
 * @route   GET /api/search/normalized
 * @desc    Get normalized TF-IDF matrix
 * @access  Private
 */
router.get('/normalized', verifyToken, getNormalizedTFIDF);

/**
 * @route   POST /api/search/query
 * @desc    Search documents with phrase query and boolean operators
 * @access  Private
 */
router.post('/query', verifyToken, sanitizeInput, validateSearch, rateLimiter(50, 1), search);

export default router;

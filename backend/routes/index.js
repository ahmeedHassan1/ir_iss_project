import express from 'express';
import { buildIndex, getIndex, getIndexStats, getStatus } from '../controllers/indexController.js';
import { verifyToken } from '../middleware/auth.js';
import { rateLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

/**
 * @route   POST /api/index/build
 * @desc    Build positional index using Spark
 * @access  Private
 */
router.post('/build', verifyToken, rateLimiter(5, 5), buildIndex);

/**
 * @route   GET /api/index
 * @desc    Get positional index
 * @access  Private
 */
router.get('/', verifyToken, getIndex);

/**
 * @route   GET /api/index/stats
 * @desc    Get index statistics
 * @access  Private
 */
router.get('/stats', verifyToken, getIndexStats);

/**
 * @route   GET /api/index/status
 * @desc    Get Spark status
 * @access  Private
 */
router.get('/status', verifyToken, getStatus);

export default router;

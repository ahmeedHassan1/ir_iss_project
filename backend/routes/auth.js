import express from 'express';
import passport from '../config/passport.js';
import { register, login, logout, googleCallback, getCurrentUser } from '../controllers/authController.js';
import { validateRegistration, validateLogin } from '../middleware/validator.js';
import { sanitizeInput } from '../middleware/sanitizer.js';
import { rateLimiter } from '../middleware/rateLimiter.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Apply rate limiting to auth endpoints (stricter limits)
const authRateLimiter = rateLimiter(10, 1); // 10 requests per minute

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user with email/password
 * @access  Public
 */
router.post('/register', authRateLimiter, sanitizeInput, validateRegistration, register);

/**
 * @route   POST /api/auth/login
 * @desc    Login with email/password
 * @access  Public
 */
router.post('/login', authRateLimiter, sanitizeInput, validateLogin, login);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout (revoke token)
 * @access  Private
 */
router.post('/logout', verifyToken, logout);

/**
 * @route   GET /api/auth/google
 * @desc    Initiate Google OAuth (ISS Requirement: SSO)
 * @access  Public
 */
router.get('/google', passport.authenticate('google', { 
  scope: ['profile', 'email'] 
}));

/**
 * @route   GET /api/auth/google/callback
 * @desc    Google OAuth callback
 * @access  Public
 */
router.get('/google/callback', 
  passport.authenticate('google', { 
    failureRedirect: `${process.env.FRONTEND_URL}/auth/login?error=auth_failed`,
    session: false
  }), 
  googleCallback
);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user info
 * @access  Private
 */
router.get('/me', verifyToken, getCurrentUser);

export default router;

import jwt from 'jsonwebtoken';
import { query } from '../config/db.js';
import { hashToken } from '../services/hashingService.js';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-min-32-chars';
const JWT_EXPIRATION = '24h';

/**
 * Generate a JWT token for a user (ISS Requirement: Token-based Authentication)
 * @param {Object} user - User object with id, email, role
 * @returns {string} JWT token
 */
export const generateToken = (user) => {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    username: user.username
  };
  
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRATION });
};

/**
 * Store token hash in database
 * @param {number} userId - User ID
 * @param {string} token - JWT token
 * @returns {Promise<void>}
 */
export const storeToken = async (userId, token) => {
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  
  await query(
    `INSERT INTO api_tokens (user_id, token_hash, expires_at, last_used_at) 
     VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
    [userId, tokenHash, expiresAt]
  );
};

/**
 * Revoke a token (logout)
 * @param {string} token - JWT token to revoke
 * @returns {Promise<void>}
 */
export const revokeToken = async (token) => {
  const tokenHash = hashToken(token);
  
  await query(
    `UPDATE api_tokens SET is_revoked = true WHERE token_hash = $1`,
    [tokenHash]
  );
};

/**
 * Verify JWT token middleware (ISS Requirement: Token-based Authentication)
 * Protects routes by checking if user is authenticated
 */
export const verifyToken = async (req, res, next) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access denied. No token provided.' 
      });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify JWT signature and expiration
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtError) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid or expired token.' 
      });
    }
    
    // Check if token is revoked in database
    const tokenHash = hashToken(token);
    const result = await query(
      `SELECT * FROM api_tokens 
       WHERE token_hash = $1 AND is_revoked = false AND expires_at > CURRENT_TIMESTAMP`,
      [tokenHash]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ 
        success: false, 
        message: 'Token has been revoked or expired.' 
      });
    }
    
    // Update last used timestamp
    await query(
      `UPDATE api_tokens SET last_used_at = CURRENT_TIMESTAMP WHERE token_hash = $1`,
      [tokenHash]
    );
    
    // Attach user info to request
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error during authentication.' 
    });
  }
};

/**
 * Optional authentication middleware (doesn't fail if no token)
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }
    
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    
    const tokenHash = hashToken(token);
    const result = await query(
      `SELECT * FROM api_tokens 
       WHERE token_hash = $1 AND is_revoked = false AND expires_at > CURRENT_TIMESTAMP`,
      [tokenHash]
    );
    
    if (result.rows.length > 0) {
      req.user = decoded;
    } else {
      req.user = null;
    }
    
    next();
  } catch (error) {
    req.user = null;
    next();
  }
};

/**
 * Role-based authorization middleware
 * @param {string[]} roles - Allowed roles
 */
export const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required.' 
      });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Insufficient permissions.' 
      });
    }
    
    next();
  };
};

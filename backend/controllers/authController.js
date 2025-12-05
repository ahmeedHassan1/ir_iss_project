import { query } from '../config/db.js';
import { hashPassword, verifyPassword } from '../services/hashingService.js';
import { generateToken, storeToken, revokeToken } from '../middleware/auth.js';
import { logAction } from '../middleware/auditLogger.js';

/**
 * Register a new user with email/password
 */
export const register = async (req, res) => {
  try {
    const { email, password, username } = req.body;
    
    // Check if user already exists
    const existingUser = await query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    
    if (existingUser.rows.length > 0) {
      await logAction(req, 'REGISTER', 'FAILED', { reason: 'Email already exists' });
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }
    
    // Hash password using bcrypt (ISS Requirement: Hashing)
    const { hash, salt } = await hashPassword(password);
    
    // Create user
    const result = await query(
      `INSERT INTO users (username, email, password_hash, salt, role, is_active, created_at) 
       VALUES ($1, $2, $3, $4, 'user', true, CURRENT_TIMESTAMP) 
       RETURNING id, username, email, role, created_at`,
      [username || email.split('@')[0], email, hash, salt]
    );
    
    const user = result.rows[0];
    
    // Generate JWT token (ISS Requirement: Token-based Authentication)
    const token = generateToken(user);
    
    // Store token hash in database
    await storeToken(user.id, token);
    
    await logAction(req, 'REGISTER', 'SUCCESS', { userId: user.id, email });
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        },
        token
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    await logAction(req, 'REGISTER', 'FAILED', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message
    });
  }
};

/**
 * Login with email/password
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Get user
    const result = await query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    
    if (result.rows.length === 0) {
      await logAction(req, 'LOGIN', 'FAILED', { reason: 'User not found', email });
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }
    
    const user = result.rows[0];
    
    // Check if account is locked
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      await logAction(req, 'LOGIN', 'FAILED', { reason: 'Account locked', userId: user.id });
      return res.status(403).json({
        success: false,
        message: 'Account is temporarily locked. Please try again later.'
      });
    }
    
    // Verify password
    const isValid = await verifyPassword(password, user.password_hash);
    
    if (!isValid) {
      // Increment failed login attempts
      const attempts = user.failed_login_attempts + 1;
      let lockedUntil = null;
      
      // Lock account after 5 failed attempts for 15 minutes
      if (attempts >= 5) {
        lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
      }
      
      await query(
        'UPDATE users SET failed_login_attempts = $1, locked_until = $2 WHERE id = $3',
        [attempts, lockedUntil, user.id]
      );
      
      await logAction(req, 'LOGIN', 'FAILED', { 
        reason: 'Invalid password', 
        userId: user.id, 
        attempts 
      });
      
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }
    
    // Check if account is active
    if (!user.is_active) {
      await logAction(req, 'LOGIN', 'FAILED', { reason: 'Account inactive', userId: user.id });
      return res.status(403).json({
        success: false,
        message: 'Account is not active'
      });
    }
    
    // Reset failed login attempts and update last login
    await query(
      'UPDATE users SET failed_login_attempts = 0, locked_until = NULL, last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );
    
    // Generate JWT token
    const token = generateToken(user);
    
    // Store token hash in database
    await storeToken(user.id, token);
    
    await logAction(req, 'LOGIN', 'SUCCESS', { userId: user.id, email });
    
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        },
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    await logAction(req, 'LOGIN', 'FAILED', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message
    });
  }
};

/**
 * Logout (revoke token)
 */
export const logout = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (token) {
      await revokeToken(token);
    }
    
    await logAction(req, 'LOGOUT', 'SUCCESS', { userId: req.user?.id });
    
    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Logout error:', error);
    await logAction(req, 'LOGOUT', 'FAILED', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Logout failed',
      error: error.message
    });
  }
};

/**
 * Google OAuth callback (ISS Requirement: SSO)
 */
export const googleCallback = async (req, res) => {
  try {
    const user = req.user;
    
    if (!user) {
      return res.redirect(`${process.env.FRONTEND_URL}/auth/login?error=auth_failed`);
    }
    
    // Generate JWT token
    const token = generateToken(user);
    
    // Store token hash in database
    await storeToken(user.id, token);
    
    await logAction(req, 'LOGIN_SSO', 'SUCCESS', { userId: user.id, provider: 'google' });
    
    // Redirect to frontend with token
    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    await logAction(req, 'LOGIN_SSO', 'FAILED', { error: error.message });
    res.redirect(`${process.env.FRONTEND_URL}/auth/login?error=auth_failed`);
  }
};

/**
 * Get current user info
 */
export const getCurrentUser = async (req, res) => {
  try {
    const result = await query(
      'SELECT id, username, email, role, created_at, last_login FROM users WHERE id = $1',
      [req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.json({
      success: true,
      data: { user: result.rows[0] }
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user info',
      error: error.message
    });
  }
};

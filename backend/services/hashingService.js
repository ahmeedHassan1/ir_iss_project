import bcrypt from 'bcrypt';
import crypto from 'crypto';

const SALT_ROUNDS = 12;

/**
 * Hash a password using bcrypt with salt (ISS Requirement: Hashing)
 * @param {string} password - Plain text password
 * @returns {Promise<{hash: string, salt: string}>} Hashed password and salt
 */
export const hashPassword = async (password) => {
  try {
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    const hash = await bcrypt.hash(password, salt);
    return { hash, salt };
  } catch (error) {
    console.error('Error hashing password:', error);
    throw new Error('Password hashing failed');
  }
};

/**
 * Verify a password against a hash
 * @param {string} password - Plain text password
 * @param {string} hash - Bcrypt hash to compare against
 * @returns {Promise<boolean>} True if password matches
 */
export const verifyPassword = async (password, hash) => {
  try {
    return await bcrypt.compare(password, hash);
  } catch (error) {
    console.error('Error verifying password:', error);
    return false;
  }
};

/**
 * Generate SHA-256 hash for content integrity (ISS Requirement: Hashing)
 * @param {string} content - Content to hash
 * @returns {string} SHA-256 hash in hexadecimal
 */
export const generateContentHash = (content) => {
  return crypto.createHash('sha256').update(content).digest('hex');
};

/**
 * Generate SHA-256 hash for JWT tokens
 * @param {string} token - JWT token to hash
 * @returns {string} SHA-256 hash in hexadecimal
 */
export const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Verify content integrity by comparing hashes
 * @param {string} content - Content to verify
 * @param {string} expectedHash - Expected SHA-256 hash
 * @returns {boolean} True if content matches hash
 */
export const verifyContentIntegrity = (content, expectedHash) => {
  const actualHash = generateContentHash(content);
  return actualHash === expectedHash;
};

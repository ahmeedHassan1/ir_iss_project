import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

// AES-256-GCM requires a 32-byte key
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex').substring(0, 32);
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

// Ensure the key is exactly 32 bytes
const getEncryptionKey = () => {
  if (ENCRYPTION_KEY.length !== 32) {
    console.warn('⚠️  ENCRYPTION_KEY must be 32 characters. Padding/truncating...');
    return ENCRYPTION_KEY.padEnd(32, '0').substring(0, 32);
  }
  return ENCRYPTION_KEY;
};

/**
 * Encrypt content using AES-256-GCM (ISS Requirement: Encryption)
 * @param {string} text - Plain text to encrypt
 * @returns {{encrypted: string, iv: string, authTag: string}} Encrypted data with IV and auth tag
 */
export const encryptContent = (text) => {
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(getEncryptionKey(), 'utf-8'), iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  } catch (error) {
    console.error('Error encrypting content:', error);
    throw new Error('Content encryption failed');
  }
};

/**
 * Decrypt content using AES-256-GCM
 * @param {string} encrypted - Encrypted text in hexadecimal
 * @param {string} ivHex - Initialization vector in hexadecimal
 * @param {string} authTagHex - Authentication tag in hexadecimal
 * @returns {string} Decrypted plain text
 */
export const decryptContent = (encrypted, ivHex, authTagHex) => {
  try {
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(getEncryptionKey(), 'utf-8'), iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Error decrypting content:', error);
    throw new Error('Content decryption failed');
  }
};

/**
 * Encrypt a document with all metadata
 * @param {string} content - Document content to encrypt
 * @returns {{encryptedContent: string, iv: string, authTag: string}} Encryption data
 */
export const encryptDocument = (content) => {
  const { encrypted, iv, authTag } = encryptContent(content);
  return {
    encryptedContent: encrypted,
    iv,
    authTag
  };
};

/**
 * Decrypt a document
 * @param {string} encryptedContent - Encrypted content
 * @param {string} iv - Initialization vector
 * @param {string} authTag - Authentication tag
 * @returns {string} Decrypted content
 */
export const decryptDocument = (encryptedContent, iv, authTag) => {
  return decryptContent(encryptedContent, iv, authTag);
};

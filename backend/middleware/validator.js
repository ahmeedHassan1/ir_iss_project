import { body, param, query as expressQuery, validationResult } from 'express-validator';

/**
 * Handle validation errors (ISS Requirement: SQL Injection Prevention)
 */
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  
  next();
};

/**
 * Validation rules for user registration
 */
export const validateRegistration = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  handleValidationErrors
];

/**
 * Validation rules for user login
 */
export const validateLogin = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors
];

/**
 * Validation rules for search query
 */
export const validateSearch = [
  body('query')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Query must be between 1 and 200 characters')
    .matches(/^[a-zA-Z0-9\s"]+$/)
    .withMessage('Query can only contain letters, numbers, spaces, and quotes'),
  handleValidationErrors
];

/**
 * Validation rules for document ID parameter
 */
export const validateDocId = [
  param('id')
    .trim()
    .matches(/^doc\d+$/)
    .withMessage('Invalid document ID format'),
  handleValidationErrors
];

/**
 * Validation rules for file upload
 */
export const validateFileUpload = (req, res, next) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No files uploaded'
    });
  }
  
  // Check file types
  const invalidFiles = req.files.filter(file => !file.originalname.endsWith('.txt'));
  
  if (invalidFiles.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Only .txt files are allowed'
    });
  }
  
  next();
};

/**
 * Generic parameter sanitization
 */
export const sanitizeParams = (req, res, next) => {
  // Remove any potential SQL injection characters from params
  Object.keys(req.params).forEach(key => {
    if (typeof req.params[key] === 'string') {
      req.params[key] = req.params[key].replace(/[;'"\\]/g, '');
    }
  });
  
  next();
};

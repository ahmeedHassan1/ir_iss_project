import xss from 'xss';

/**
 * XSS sanitization middleware (ISS Requirement: XSS Prevention)
 * Sanitizes all user inputs to prevent XSS attacks
 */
export const sanitizeInput = (req, res, next) => {
  try {
    // Sanitize body
    if (req.body) {
      req.body = sanitizeObject(req.body);
    }
    
    // Sanitize query parameters
    if (req.query) {
      req.query = sanitizeObject(req.query);
    }
    
    // Sanitize URL parameters
    if (req.params) {
      req.params = sanitizeObject(req.params);
    }
    
    next();
  } catch (error) {
    console.error('Sanitization error:', error);
    next(); // Don't block request if sanitization fails
  }
};

/**
 * Recursively sanitize an object
 * @param {Object} obj - Object to sanitize
 * @returns {Object} Sanitized object
 */
const sanitizeObject = (obj) => {
  if (typeof obj === 'string') {
    return xss(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  if (typeof obj === 'object' && obj !== null) {
    const sanitized = {};
    for (const key in obj) {
      sanitized[key] = sanitizeObject(obj[key]);
    }
    return sanitized;
  }
  
  return obj;
};

/**
 * Sanitize a single string
 * @param {string} str - String to sanitize
 * @returns {string} Sanitized string
 */
export const sanitizeString = (str) => {
  if (typeof str !== 'string') {
    return str;
  }
  return xss(str);
};

/**
 * Sanitize HTML content more aggressively
 * @param {string} html - HTML content to sanitize
 * @returns {string} Sanitized HTML
 */
export const sanitizeHTML = (html) => {
  const options = {
    whiteList: {}, // Remove all HTML tags
    stripIgnoreTag: true,
    stripIgnoreTagBody: ['script', 'style']
  };
  
  return xss(html, options);
};

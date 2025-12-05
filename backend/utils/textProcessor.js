/**
 * Text processing utilities for Information Retrieval
 */

/**
 * Tokenize text into words (lowercase, alphanumeric only)
 * @param {string} text - Text to tokenize
 * @returns {string[]} Array of tokens
 */
export const tokenize = (text) => {
  if (!text || typeof text !== 'string') {
    return [];
  }
  
  // Convert to lowercase and extract alphanumeric words
  const tokens = text
    .toLowerCase()
    .match(/[a-z0-9]+/g) || [];
  
  return tokens;
};

/**
 * Build positional index for a single document
 * @param {string} text - Document text
 * @returns {Object} Positional index { term: [positions] }
 */
export const buildDocumentPositionalIndex = (text) => {
  const tokens = tokenize(text);
  const index = {};
  
  tokens.forEach((token, position) => {
    if (!index[token]) {
      index[token] = [];
    }
    index[token].push(position);
  });
  
  return index;
};

/**
 * Count words in text
 * @param {string} text - Text to count
 * @returns {number} Word count
 */
export const countWords = (text) => {
  return tokenize(text).length;
};

/**
 * Remove stopwords (optional enhancement)
 * @param {string[]} tokens - Array of tokens
 * @returns {string[]} Filtered tokens
 */
export const removeStopwords = (tokens) => {
  const stopwords = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 
    'from', 'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 
    'that', 'the', 'to', 'was', 'will', 'with'
  ]);
  
  return tokens.filter(token => !stopwords.has(token));
};

/**
 * Generate text snippet with highlighted terms
 * @param {string} text - Full text
 * @param {string[]} terms - Terms to highlight
 * @param {number} maxLength - Maximum snippet length
 * @returns {string} Snippet with highlighted terms
 */
export const generateSnippet = (text, terms, maxLength = 200) => {
  const lowerText = text.toLowerCase();
  const lowerTerms = terms.map(t => t.toLowerCase());
  
  // Find first occurrence of any term
  let firstIndex = -1;
  for (const term of lowerTerms) {
    const index = lowerText.indexOf(term);
    if (index !== -1 && (firstIndex === -1 || index < firstIndex)) {
      firstIndex = index;
    }
  }
  
  if (firstIndex === -1) {
    return text.substring(0, maxLength) + '...';
  }
  
  // Get surrounding context
  const start = Math.max(0, firstIndex - 50);
  const end = Math.min(text.length, firstIndex + maxLength);
  let snippet = text.substring(start, end);
  
  // Add ellipsis
  if (start > 0) snippet = '...' + snippet;
  if (end < text.length) snippet = snippet + '...';
  
  return snippet;
};

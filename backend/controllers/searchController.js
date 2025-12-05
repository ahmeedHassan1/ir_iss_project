import { calculateTermFrequency, calculateIDF, calculateTFIDF, calculateNormalizedTFIDF } from '../services/tfIdf.js';
import { processQuery } from '../services/queryProcessor.js';
import { logAction } from '../middleware/auditLogger.js';

/**
 * Get term frequency matrix
 */
export const getTermFrequency = async (req, res) => {
  try {
    const result = await calculateTermFrequency();
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Get TF error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate term frequency',
      error: error.message
    });
  }
};

/**
 * Get IDF values
 */
export const getIDF = async (req, res) => {
  try {
    const result = await calculateIDF();
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Get IDF error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate IDF',
      error: error.message
    });
  }
};

/**
 * Get TF-IDF matrix
 */
export const getTFIDFMatrix = async (req, res) => {
  try {
    const result = await calculateTFIDF();
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Get TF-IDF error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate TF-IDF',
      error: error.message
    });
  }
};

/**
 * Get normalized TF-IDF matrix
 */
export const getNormalizedTFIDF = async (req, res) => {
  try {
    const result = await calculateNormalizedTFIDF();
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Get normalized TF-IDF error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate normalized TF-IDF',
      error: error.message
    });
  }
};

/**
 * Search documents
 */
export const search = async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Query is required'
      });
    }
    
    const results = await processQuery(query);
    
    await logAction(req, 'SEARCH', 'SUCCESS', { 
      query, 
      resultCount: results.length,
      topResult: results[0]?.doc_id
    });
    
    res.json({
      success: true,
      data: {
        query,
        resultCount: results.length,
        results
      }
    });
  } catch (error) {
    console.error('Search error:', error);
    await logAction(req, 'SEARCH', 'FAILED', { query: req.body.query, error: error.message });
    res.status(500).json({
      success: false,
      message: 'Search failed',
      error: error.message
    });
  }
};

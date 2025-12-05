import { query } from '../config/db.js';
import { buildPositionalIndex, getSparkStatus } from '../services/sparkService.js';
import { logAction } from '../middleware/auditLogger.js';

/**
 * Build positional index using Spark
 */
export const buildIndex = async (req, res) => {
  try {
    console.log('Starting positional index build...');
    
    const result = await buildPositionalIndex();
    
    await logAction(req, 'BUILD_INDEX', 'SUCCESS', { sparkOutput: result.output.substring(0, 500) });
    
    res.json({
      success: true,
      message: 'Positional index built successfully',
      data: result
    });
  } catch (error) {
    console.error('Build index error:', error);
    await logAction(req, 'BUILD_INDEX', 'FAILED', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to build index',
      error: error.message
    });
  }
};

/**
 * Get positional index
 */
export const getIndex = async (req, res) => {
  try {
    const result = await query(
      `SELECT term, doc_id, positions 
       FROM positional_index 
       ORDER BY term, doc_id`
    );
    
    // Group by term
    const index = {};
    
    for (const row of result.rows) {
      if (!index[row.term]) {
        index[row.term] = {};
      }
      index[row.term][row.doc_id] = row.positions;
    }
    
    res.json({
      success: true,
      data: { index }
    });
  } catch (error) {
    console.error('Get index error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve index',
      error: error.message
    });
  }
};

/**
 * Get index statistics
 */
export const getIndexStats = async (req, res) => {
  try {
    const termsResult = await query('SELECT COUNT(DISTINCT term) as count FROM positional_index');
    const docsResult = await query('SELECT COUNT(DISTINCT doc_id) as count FROM positional_index');
    const entriesResult = await query('SELECT COUNT(*) as count FROM positional_index');
    
    const stats = {
      totalTerms: parseInt(termsResult.rows[0].count),
      totalDocuments: parseInt(docsResult.rows[0].count),
      totalEntries: parseInt(entriesResult.rows[0].count)
    };
    
    res.json({
      success: true,
      data: { stats }
    });
  } catch (error) {
    console.error('Get index stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve index statistics',
      error: error.message
    });
  }
};

/**
 * Get Spark status
 */
export const getStatus = async (req, res) => {
  try {
    const status = await getSparkStatus();
    
    res.json({
      success: true,
      data: { status }
    });
  } catch (error) {
    console.error('Get Spark status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get Spark status',
      error: error.message
    });
  }
};

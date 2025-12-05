import { query } from '../config/db.js';

/**
 * Audit logger middleware (ISS Requirement: Logging)
 * Logs all security-relevant events to the database
 * @param {string} action - Action type (LOGIN, LOGOUT, UPLOAD, DELETE, SEARCH, etc.)
 */
export const auditLogger = (action) => {
  return async (req, res, next) => {
    // Store original functions
    const originalJson = res.json;
    const originalSend = res.send;
    
    // Track response status
    let responseStatus = 'SUCCESS';
    let responseData = null;
    
    // Override res.json to capture response
    res.json = function (data) {
      responseData = data;
      if (data && !data.success) {
        responseStatus = 'FAILED';
      }
      return originalJson.call(this, data);
    };
    
    // Override res.send to capture response
    res.send = function (data) {
      responseData = data;
      return originalSend.call(this, data);
    };
    
    // Continue with request
    res.on('finish', async () => {
      try {
        await logAction(req, action, responseStatus, responseData);
      } catch (error) {
        console.error('Audit logging error:', error);
      }
    });
    
    next();
  };
};

/**
 * Log an action to the audit_logs table
 * @param {Object} req - Express request object
 * @param {string} action - Action type
 * @param {string} status - Status (SUCCESS or FAILED)
 * @param {any} details - Additional details to log
 */
export const logAction = async (req, action, status, details = null) => {
  try {
    const userId = req.user?.id || null;
    const resource = req.path;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];
    
    // Sanitize details for JSONB storage
    let sanitizedDetails = null;
    if (details) {
      try {
        // Remove sensitive information
        const detailsCopy = JSON.parse(JSON.stringify(details));
        if (detailsCopy.password) delete detailsCopy.password;
        if (detailsCopy.token) delete detailsCopy.token;
        sanitizedDetails = detailsCopy;
      } catch (e) {
        sanitizedDetails = { message: String(details) };
      }
    }
    
    await query(
      `INSERT INTO audit_logs (user_id, action, resource, ip_address, user_agent, status, details) 
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, action, resource, ipAddress, userAgent, status, sanitizedDetails]
    );
    
    console.log(`📝 Audit log: ${action} - ${status} - User: ${userId || 'anonymous'} - IP: ${ipAddress}`);
  } catch (error) {
    console.error('Error logging audit entry:', error);
  }
};

/**
 * Get audit logs for a user
 * @param {number} userId - User ID
 * @param {number} limit - Number of logs to retrieve
 * @returns {Promise<Array>} Array of audit logs
 */
export const getUserAuditLogs = async (userId, limit = 100) => {
  const result = await query(
    `SELECT * FROM audit_logs 
     WHERE user_id = $1 
     ORDER BY created_at DESC 
     LIMIT $2`,
    [userId, limit]
  );
  
  return result.rows;
};

/**
 * Get all audit logs (admin only)
 * @param {number} limit - Number of logs to retrieve
 * @param {number} offset - Offset for pagination
 * @returns {Promise<Array>} Array of audit logs
 */
export const getAllAuditLogs = async (limit = 100, offset = 0) => {
  const result = await query(
    `SELECT al.*, u.email, u.username 
     FROM audit_logs al 
     LEFT JOIN users u ON al.user_id = u.id 
     ORDER BY al.created_at DESC 
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  
  return result.rows;
};

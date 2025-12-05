import { query } from '../config/db.js';

/**
 * Database-backed rate limiter (ISS Requirement: DoS Protection)
 * Prevents abuse by limiting requests per endpoint per identifier
 * @param {number} maxRequests - Maximum requests allowed in the window
 * @param {number} windowMinutes - Time window in minutes
 */
export const rateLimiter = (maxRequests = 100, windowMinutes = 1) => {
  return async (req, res, next) => {
    try {
      // Use IP address or user ID as identifier
      const identifier = req.user?.id?.toString() || req.ip || req.connection.remoteAddress;
      const endpoint = req.path;
      
      // Calculate window start time
      const windowStart = new Date();
      windowStart.setMinutes(windowStart.getMinutes() - windowMinutes);
      
      // Clean up old rate limit entries (older than window)
      await query(
        'DELETE FROM rate_limits WHERE window_start < $1',
        [windowStart]
      );
      
      // Get current request count for this identifier and endpoint
      const result = await query(
        `SELECT request_count FROM rate_limits 
         WHERE identifier = $1 AND endpoint = $2 AND window_start >= $3`,
        [identifier, endpoint, windowStart]
      );
      
      let requestCount = 0;
      
      if (result.rows.length > 0) {
        requestCount = result.rows[0].request_count;
      }
      
      // Check if limit exceeded
      if (requestCount >= maxRequests) {
        return res.status(429).json({
          success: false,
          message: 'Too many requests. Please try again later.',
          retryAfter: windowMinutes * 60
        });
      }
      
      // Increment or insert request count
      await query(
        `INSERT INTO rate_limits (identifier, endpoint, request_count, window_start) 
         VALUES ($1, $2, 1, CURRENT_TIMESTAMP)
         ON CONFLICT (identifier, endpoint, window_start) 
         DO UPDATE SET request_count = rate_limits.request_count + 1`,
        [identifier, endpoint]
      );
      
      // Add rate limit headers
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', maxRequests - requestCount - 1);
      res.setHeader('X-RateLimit-Reset', new Date(Date.now() + windowMinutes * 60 * 1000).toISOString());
      
      next();
    } catch (error) {
      console.error('Rate limiter error:', error);
      // Don't block request if rate limiter fails
      next();
    }
  };
};

/**
 * Cleanup old rate limit entries (run periodically)
 */
export const cleanupRateLimits = async () => {
  try {
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    
    const result = await query(
      'DELETE FROM rate_limits WHERE window_start < $1',
      [oneDayAgo]
    );
    
    console.log(`Cleaned up ${result.rowCount} old rate limit entries`);
  } catch (error) {
    console.error('Error cleaning up rate limits:', error);
  }
};

// Run cleanup every hour
setInterval(cleanupRateLimits, 60 * 60 * 1000);

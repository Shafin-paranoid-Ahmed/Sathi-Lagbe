// server/middleware/auth.js - Fixed implementation
const jwt = require('jsonwebtoken');
/**
 * Authentication middleware that supports multiple token formats
 * Compatible with both ONLYGWUB and Sathi_Lagbe token handling
 */
const authenticateUser = (req, res, next) => {
	try {
		// Try to get token from different formats
		let token;
		
		// Format: "Bearer [token]" (ONLYGWUB style)
		if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
			token = req.headers.authorization.split(' ')[1];
		} 
		// Format: direct token in authorization header (Sathi_Lagbe style)
		else if (req.headers.authorization) {
			token = req.headers.authorization;
		} else if (req.query.token) {
      // Format: token in query parameter (for SSE)
      token = req.query.token;
    }
		
		if (!token) {
			return res.status(401).json({
				message: "No authentication token provided",
				success: false
			});
		}

		// Verify token using environment variable (support both naming conventions)
		const secret = process.env.SECRET_KEY || process.env.JWT_SECRET;
		const decodedToken = jwt.verify(token, secret);
		
		// Initialize req.user if it doesn't exist
		if (!req.user) {
			req.user = {};
		}
		
		// Initialize req.body if it doesn't exist
		if (!req.body) {
			req.body = {};
		}
		
		// Support both formats for backward compatibility
		req.user = decodedToken;
		
		// Normalize authenticated user id onto req.user.id
		const authUserId = decodedToken.userId || decodedToken.id;
		if (authUserId) {
			req.user.id = authUserId;
			// Only backfill req.body.userId if client did not provide one
			if (typeof req.body.userId === 'undefined' || req.body.userId === null) {
				req.body.userId = authUserId;
			}
		}

		next();
	} catch (error) {
		console.error("Auth middleware error:", error);
		return res.status(401).json({
			message: error.message || "Invalid or expired token",
			success: false
		});
	}
};

// Export as both default and named function for backward compatibility
module.exports = authenticateUser;
module.exports.authenticateUser = authenticateUser;
module.exports.verifyToken = authenticateUser; // Extra alias for compatibility
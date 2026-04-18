// server/middleware/auth.js
const { verifyToken } = require('../utils/jwt');

/**
 * Authentication middleware.
 * Accepts `Authorization: Bearer <token>` or bare `Authorization: <token>`.
 * On success, populates `req.user` with the decoded payload and a normalized `req.user.id`.
 */
const authenticateUser = (req, res, next) => {
	try {
		let token;

		if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
			token = req.headers.authorization.split(' ')[1];
		} else if (req.headers.authorization) {
			token = req.headers.authorization;
		}

		if (!token) {
			return res.status(401).json({
				success: false,
				error: 'No token provided',
				message: 'No authentication token provided'
			});
		}

		const decodedToken = verifyToken(token);

		req.user = decodedToken;
		const authUserId = decodedToken.userId || decodedToken.id;
		if (authUserId) {
			req.user.id = authUserId;
		}

		next();
	} catch (error) {
		const isExpired = error && error.name === 'TokenExpiredError';
		const errorText = isExpired ? 'Token expired' : 'Invalid token';
		return res.status(401).json({
			success: false,
			error: errorText,
			message: errorText
		});
	}
};

module.exports = authenticateUser;
module.exports.authenticateUser = authenticateUser;

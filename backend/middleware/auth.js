// middleware/auth.js
const jwt = require('jsonwebtoken');

// Export as both default and named function for backward compatibility
const authenticateUser = (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({
                message: "No authentication token provided",
                success: false
            });
        }

        const decodedToken = jwt.verify(token, process.env.SECRET_KEY || process.env.JWT_SECRET);
        req.user = decodedToken; // Store all decoded data
        req.body.userId = decodedToken.userId; // For backward compatibility

        next();
    } catch (error) {
        return res.status(401).json({
            message: error.message,
            success: false
        });
    }
};

module.exports = authenticateUser;
module.exports.authenticateUser = authenticateUser;
const jwt = require('jsonwebtoken');

/**
 * Middleware to verify JWT token and attach user information to the request.
 * Assumes the token is sent in the 'Authorization' header as 'Bearer TOKEN'.
 */
module.exports = function (req, res, next) {
    // Get token from header
    const token = req.header('x-auth-token') || req.header('Authorization')?.replace('Bearer ', '');

    // Check if no token
    if (!token) {
        return res.status(401).json({ message: 'No authentication token, authorization denied.' });
    }

    try {
        // Verify token
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            console.error("Server configuration error: JWT_SECRET environment variable is not set.");
            return res.status(500).json({ message: 'Server configuration error: Authentication secret is missing.' });
        }

        // ... (inside the try block)
        const decoded = jwt.verify(token, jwtSecret);
        req.user = decoded; // Correct
        next();
    } catch (err) {
        // Handle token expiration, invalid token, etc.
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Authentication token has expired.' });
        }
        if (err.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Authentication token is invalid.' });
        }
        console.error('Error verifying token:', err.message);
        res.status(500).json({ message: 'Server error during token verification.' });
    }
};

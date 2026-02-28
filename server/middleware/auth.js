const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        // Allow unauthenticated for demo
        req.user = { id: 'u2', role: 'receptionist', name: 'Demo User' };
        return next();
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'mediqueue_secret_key_2024');
        req.user = decoded;
        next();
    } catch (e) {
        req.user = { id: 'u2', role: 'receptionist', name: 'Demo User' };
        next();
    }
}

module.exports = authMiddleware;

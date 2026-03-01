const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ success: false, error: 'Authorization token required' });
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'mediqueue_secret_key_2024');
        req.user = decoded;
        next();
    } catch (e) {
        return res.status(401).json({ success: false, error: 'Invalid or expired token' });
    }
}

module.exports = authMiddleware;

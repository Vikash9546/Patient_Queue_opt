const UserActivity = require('../models/UserActivity');
const { generateId } = require('../utils/helpers');

async function activityLogger(req, res, next) {
    // Only log write operations (state modifying actions)
    if (req.method !== 'GET') {
        const userId = req.user?.id || 'anonymous';

        try {
            // Strip out sensitive payload data before storing (e.g. passwords)
            const safeBody = { ...req.body };
            if (safeBody.password) delete safeBody.password;

            await UserActivity.create({
                _id: generateId(),
                user_id: userId,
                action: `${req.method} ${req.originalUrl}`,
                method: req.method,
                path: req.originalUrl,
                payload: Object.keys(safeBody).length > 0 ? JSON.stringify(safeBody) : null,
                created_at: new Date()
            });
        } catch (error) {
            console.error('Failed to log user activity:', error.message);
        }
    }
    next();
}

module.exports = activityLogger;

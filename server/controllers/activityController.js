const UserActivity = require('../models/UserActivity');

exports.getActivityLogs = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 100;

        // Fetch latest activities sorted by created_at descending
        const activities = await UserActivity.find({})
            .sort({ created_at: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            // Optional: you could populate user name if User referenced it,
            // but for now we just return the raw activity.
            .lean();

        const total = await UserActivity.countDocuments();

        res.json({
            success: true,
            data: activities,
            meta: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

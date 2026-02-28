const analyticsService = require('../services/analyticsService');

exports.dailyStats = async (req, res) => {
    try {
        const { date } = req.query;
        const stats = await analyticsService.getDailyStats(date);
        res.json({ success: true, data: stats });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.waitTimes = async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 7;
        const data = await analyticsService.getWaitTimeAnalytics(days);
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.utilization = async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 7;
        const data = await analyticsService.getDoctorUtilization(days);
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.peakHours = async (req, res) => {
    try {
        const data = await analyticsService.getPeakHours();
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.noShows = async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 30;
        const data = await analyticsService.getNoShowStats(days);
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.beforeAfter = (req, res) => {
    const data = analyticsService.getBeforeAfterComparison();
    res.json({ success: true, data });
};

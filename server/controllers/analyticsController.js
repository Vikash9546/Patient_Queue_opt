const analyticsService = require('../services/analyticsService');

exports.dailyStats = (req, res) => {
    const { date } = req.query;
    const stats = analyticsService.getDailyStats(date);
    res.json({ success: true, data: stats });
};

exports.waitTimes = (req, res) => {
    const days = parseInt(req.query.days) || 7;
    const data = analyticsService.getWaitTimeAnalytics(days);
    res.json({ success: true, data });
};

exports.utilization = (req, res) => {
    const days = parseInt(req.query.days) || 7;
    const data = analyticsService.getDoctorUtilization(days);
    res.json({ success: true, data });
};

exports.peakHours = (req, res) => {
    const data = analyticsService.getPeakHours();
    res.json({ success: true, data });
};

exports.noShows = (req, res) => {
    const days = parseInt(req.query.days) || 30;
    const data = analyticsService.getNoShowStats(days);
    res.json({ success: true, data });
};

exports.beforeAfter = (req, res) => {
    const data = analyticsService.getBeforeAfterComparison();
    res.json({ success: true, data });
};

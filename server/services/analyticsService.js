const Appointment = require('../models/Appointment');
const AnalyticsLog = require('../models/AnalyticsLog');
const Doctor = require('../models/Doctor');

async function getDailyStats(date) {
    const targetDate = date || new Date().toISOString().split('T')[0];

    const startOfDay = new Date(targetDate + 'T00:00:00.000Z');
    const endOfDay = new Date(targetDate + 'T23:59:59.999Z');

    const stats = await AnalyticsLog.find({ log_date: { $gte: startOfDay, $lte: endOfDay } });

    if (stats.length === 0) {
        // Calculate from live data
        const appointments = await Appointment.find({
            scheduled_time: { $gte: startOfDay, $lte: endOfDay }
        });

        const total = appointments.length;
        const completed = appointments.filter(a => a.status === 'completed').length;
        const noShows = appointments.filter(a => a.status === 'no_show').length;
        const walkIns = appointments.filter(a => a.is_walkin === 1).length;
        const emergencies = appointments.filter(a => a.urgency_level === 'emergency').length;

        return {
            date: targetDate,
            total_patients: total,
            completed,
            no_shows: noShows,
            walk_ins: walkIns,
            emergencies,
            avg_wait_time: 0,
            avg_consultation_time: 0
        };
    }

    return {
        date: targetDate,
        doctors: stats,
        total_patients: stats.reduce((sum, s) => sum + s.total_patients, 0),
        avg_wait_time: stats.reduce((sum, s) => sum + s.avg_wait_time, 0) / stats.length,
        no_shows: stats.reduce((sum, s) => sum + s.no_shows, 0),
        walk_ins: stats.reduce((sum, s) => sum + s.walk_ins, 0)
    };
}

async function getWaitTimeAnalytics(days = 7) {
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);
    sinceDate.setHours(0, 0, 0, 0);

    const stats = await AnalyticsLog.aggregate([
        { $match: { log_date: { $gte: sinceDate } } },
        {
            $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$log_date' } },
                avg_wait: { $avg: '$avg_wait_time' },
                avg_consult: { $avg: '$avg_consultation_time' }
            }
        },
        { $sort: { _id: 1 } }
    ]);

    return stats.map(s => ({
        date: s._id,
        avgWait: Math.round(s.avg_wait * 10) / 10,
        avgConsult: Math.round(s.avg_consult * 10) / 10
    }));
}

async function getDoctorUtilization(days = 7) {
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);
    sinceDate.setHours(0, 0, 0, 0);

    const stats = await AnalyticsLog.aggregate([
        { $match: { log_date: { $gte: sinceDate } } },
        {
            $group: {
                _id: '$doctor_id',
                avg_utilization: { $avg: '$utilization_pct' },
                total_patients: { $sum: '$total_patients' },
                avg_wait: { $avg: '$avg_wait_time' }
            }
        }
    ]);

    // Populate doctor names
    const result = await Promise.all(stats.map(async (s) => {
        const doctor = await Doctor.findById(s._id);
        return {
            name: doctor ? doctor.name : 'Unknown',
            specialty: doctor ? doctor.specialty : '',
            avg_utilization: s.avg_utilization,
            total_patients: s.total_patients,
            avg_wait: s.avg_wait
        };
    }));

    return result;
}

async function getPeakHours() {
    const appointments = await Appointment.find();

    // Count by hour
    const hourCounts = {};
    appointments.forEach(a => {
        const hour = new Date(a.scheduled_time).getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    // Fill missing hours
    const result = [];
    for (let h = 8; h <= 18; h++) {
        result.push({ hour: `${h}:00`, patients: hourCounts[h] || 0 });
    }
    return result;
}

async function getNoShowStats(days = 30) {
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);
    sinceDate.setHours(0, 0, 0, 0);

    const stats = await AnalyticsLog.aggregate([
        { $match: { log_date: { $gte: sinceDate } } },
        {
            $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$log_date' } },
                no_shows: { $sum: '$no_shows' },
                total: { $sum: '$total_patients' }
            }
        },
        { $sort: { _id: 1 } }
    ]);

    return stats.map(s => ({
        log_date: s._id,
        no_shows: s.no_shows,
        total: s.total,
        no_show_rate: s.total > 0 ? Math.round((s.no_shows / s.total) * 1000) / 10 : 0
    }));
}

function getBeforeAfterComparison() {
    // Simulated before/after data for demo
    return {
        before: {
            avg_wait_time: 38.5,
            patient_satisfaction: 62,
            doctor_utilization: 58,
            no_show_impact: 22,
            daily_patients: 18
        },
        after: {
            avg_wait_time: 15.2,
            patient_satisfaction: 91,
            doctor_utilization: 85,
            no_show_impact: 8,
            daily_patients: 28
        },
        improvement: {
            wait_time_reduction: '60%',
            satisfaction_increase: '47%',
            utilization_increase: '47%',
            no_show_reduction: '64%',
            throughput_increase: '56%'
        }
    };
}

module.exports = {
    getDailyStats, getWaitTimeAnalytics, getDoctorUtilization,
    getPeakHours, getNoShowStats, getBeforeAfterComparison
};

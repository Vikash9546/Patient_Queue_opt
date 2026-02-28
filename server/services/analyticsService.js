const { db } = require('../config/database');

function getDailyStats(date) {
    const targetDate = date || new Date().toISOString().split('T')[0];

    const stats = db.prepare(`SELECT * FROM analytics_logs WHERE log_date = ?`).all(targetDate);

    if (stats.length === 0) {
        // Calculate from live data
        const appointments = db.prepare(`SELECT * FROM appointments WHERE date(scheduled_time) = ?`).all(targetDate);
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

function getWaitTimeAnalytics(days = 7) {
    const stats = db.prepare(`SELECT log_date, AVG(avg_wait_time) as avg_wait, AVG(avg_consultation_time) as avg_consult
    FROM analytics_logs WHERE log_date >= date('now', '-${days} days')
    GROUP BY log_date ORDER BY log_date`).all();

    return stats.map(s => ({
        date: s.log_date,
        avgWait: Math.round(s.avg_wait * 10) / 10,
        avgConsult: Math.round(s.avg_consult * 10) / 10
    }));
}

function getDoctorUtilization(days = 7) {
    return db.prepare(`SELECT d.name, d.specialty, 
    AVG(al.utilization_pct) as avg_utilization,
    SUM(al.total_patients) as total_patients,
    AVG(al.avg_wait_time) as avg_wait
    FROM analytics_logs al JOIN doctors d ON al.doctor_id = d.id
    WHERE al.log_date >= date('now', '-${days} days')
    GROUP BY al.doctor_id`).all();
}

function getPeakHours() {
    // Simulated peak hours from appointment data
    const hours = db.prepare(`SELECT 
    CAST(strftime('%H', scheduled_time) AS INTEGER) as hour,
    COUNT(*) as count
    FROM appointments
    GROUP BY hour ORDER BY hour`).all();

    // Fill missing hours
    const result = [];
    for (let h = 8; h <= 18; h++) {
        const found = hours.find(x => x.hour === h);
        result.push({ hour: `${h}:00`, patients: found ? found.count : 0 });
    }
    return result;
}

function getNoShowStats(days = 30) {
    return db.prepare(`SELECT log_date,
    SUM(no_shows) as no_shows,
    SUM(total_patients) as total,
    ROUND(CAST(SUM(no_shows) AS REAL) / MAX(SUM(total_patients), 1) * 100, 1) as no_show_rate
    FROM analytics_logs WHERE log_date >= date('now', '-${days} days')
    GROUP BY log_date ORDER BY log_date`).all();
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

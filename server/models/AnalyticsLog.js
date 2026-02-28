const mongoose = require('mongoose');

const analyticsLogSchema = new mongoose.Schema({
    _id: { type: String, required: true }, // UUID
    doctor_id: { type: String, ref: 'Doctor', required: true },
    log_date: { type: Date, required: true }, // 1 row per doctor per day
    total_patients: { type: Number, default: 0 },
    avg_wait_time: { type: Number, default: 0.0 }, // Minutes
    avg_consultation_time: { type: Number, default: 0.0 }, // Minutes
    no_shows: { type: Number, default: 0 },
    emergencies: { type: Number, default: 0 },
    walk_ins: { type: Number, default: 0 },
    utilization_pct: { type: Number, min: 0.0, max: 100.0, default: 0.0 } // 0-100%
});

module.exports = mongoose.model('AnalyticsLog', analyticsLogSchema);

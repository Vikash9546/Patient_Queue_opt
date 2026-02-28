const mongoose = require('mongoose');

const analyticsLogSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    doctor_id: { type: String, ref: 'Doctor', default: null },
    log_date: { type: Date, required: true },
    total_patients: { type: Number, default: 0 },
    avg_wait_time: { type: Number, default: 0.0 },
    avg_consultation_time: { type: Number, default: 0.0 },
    no_shows: { type: Number, default: 0 },
    emergencies: { type: Number, default: 0 },
    walk_ins: { type: Number, default: 0 },
    utilization_pct: { type: Number, default: 0.0 }
});

module.exports = mongoose.model('AnalyticsLog', analyticsLogSchema);

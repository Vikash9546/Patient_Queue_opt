const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    patient_id: { type: String, ref: 'Patient', required: true },
    doctor_id: { type: String, ref: 'Doctor', required: true },
    scheduled_time: { type: Date, required: true },
    estimated_duration: { type: Number, default: 15 },
    status: { type: String, default: 'scheduled' },
    urgency_level: { type: String, default: 'low' },
    symptoms: { type: String, default: '' },
    ai_notes: { type: String, default: null },
    no_show_score: { type: Number, default: 0.0 },
    actual_start: { type: Date, default: null },
    actual_end: { type: Date, default: null },
    is_walkin: { type: Number, default: 0 },
    created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Appointment', appointmentSchema);

const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
    _id: { type: String, required: true }, // UUID
    patient_id: { type: String, ref: 'Patient', required: true },
    doctor_id: { type: String, ref: 'Doctor', required: true },
    scheduled_time: { type: Date, required: true },
    estimated_duration: { type: Number, default: 15 }, // AI-predicted mins
    status: { type: String, enum: ['scheduled', 'checked_in', 'in_consultation', 'completed', 'cancelled', 'no_show'], default: 'scheduled' },
    urgency_level: { type: String, enum: ['low', 'medium', 'high', 'emergency'], default: 'low' },
    symptoms: { type: String, default: '' },
    ai_notes: { type: String, default: null }, // AI triage reasoning
    no_show_score: { type: Number, min: 0.0, max: 1.0, default: 0.0 }, // 0.0-1.0
    actual_start: { type: Date, default: null },
    actual_end: { type: Date, default: null },
    // Keep is_walkin for existing app logic
    is_walkin: { type: Number, default: 0 },
    created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Appointment', appointmentSchema);

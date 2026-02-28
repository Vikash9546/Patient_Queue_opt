const mongoose = require('mongoose');

const queueEntrySchema = new mongoose.Schema({
    _id: { type: String, required: true }, // UUID
    appointment_id: { type: String, ref: 'Appointment', required: true }, // Not null
    patient_id: { type: String, ref: 'Patient', required: true },
    doctor_id: { type: String, ref: 'Doctor', required: true },
    position: { type: Number, required: true }, // 1 = next
    status: { type: String, enum: ['waiting', 'in_consultation', 'completed', 'skipped'], default: 'waiting' },
    priority: { type: String, enum: ['emergency', 'high', 'normal', 'low'], default: 'normal' },
    estimated_wait_mins: { type: Number, default: 0 }, // Dynamic
    checked_in_at: { type: Date, default: Date.now },
    called_at: { type: Date, default: null },
    completed_at: { type: Date, default: null }
});

module.exports = mongoose.model('QueueEntry', queueEntrySchema);

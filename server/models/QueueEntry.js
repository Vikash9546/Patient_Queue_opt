const mongoose = require('mongoose');

const queueEntrySchema = new mongoose.Schema({
    _id: { type: String, required: true },
    appointment_id: { type: String, ref: 'Appointment', default: null },
    patient_id: { type: String, ref: 'Patient', required: true },
    doctor_id: { type: String, ref: 'Doctor', required: true },
    position: { type: Number, required: true },
    status: { type: String, default: 'waiting' },
    priority: { type: String, default: 'normal' },
    estimated_wait_mins: { type: Number, default: 0 },
    checked_in_at: { type: Date, default: Date.now },
    called_at: { type: Date, default: null },
    completed_at: { type: Date, default: null }
});

module.exports = mongoose.model('QueueEntry', queueEntrySchema);

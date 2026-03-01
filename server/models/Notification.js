const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    _id: { type: String, required: true }, // UUID
    patient_id: { type: String, ref: 'Patient', default: null },
    type: { type: String, enum: ['queue_update', 'reminder', 'emergency', 'delay', 'wait_update'], required: true },
    message: { type: String, required: true },
    channel: { type: String, enum: ['app', 'sms', 'whatsapp'], default: 'app' },
    is_read: { type: Boolean, default: false },
    sent_at: { type: Date, default: Date.now },
    // Keep doctor_id for backward compatibility with the existing code
    doctor_id: { type: String, ref: 'Doctor', default: null }
});

module.exports = mongoose.model('Notification', notificationSchema);

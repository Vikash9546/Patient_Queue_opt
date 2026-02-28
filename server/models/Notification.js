const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    patient_id: { type: String, ref: 'Patient', default: null },
    doctor_id: { type: String, ref: 'Doctor', default: null },
    type: { type: String, required: true },
    message: { type: String, required: true },
    channel: { type: String, default: 'app' },
    is_read: { type: Number, default: 0 },
    sent_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Notification', notificationSchema);

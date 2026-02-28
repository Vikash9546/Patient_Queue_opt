const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    name: { type: String, required: true },
    specialty: { type: String, required: true },
    email: { type: String, default: null },
    phone: { type: String, default: null },
    experience_years: { type: Number, default: 0 },
    status: { type: String, default: 'available' },
    shift_start: { type: String, default: '09:00' },
    shift_end: { type: String, default: '17:00' },
    avg_consultation_mins: { type: Number, default: 15 },
    created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Doctor', doctorSchema);

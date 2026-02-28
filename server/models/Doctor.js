const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema({
    _id: { type: String, required: true }, // UUID
    name: { type: String, required: true },
    specialty: { type: String, default: 'General' }, // General | Pediatrics | Ortho | Derm
    email: { type: String, default: null },
    phone: { type: String, default: null },
    experience_years: { type: Number, default: 0 },
    status: { type: String, enum: ['available', 'busy', 'on_break', 'offline'], default: 'available' },
    shift_start: { type: String, default: '09:00' }, // time
    shift_end: { type: String, default: '17:00' }, // time
    avg_consultation_mins: { type: Number, default: 15 }, // Historical avg
    created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Doctor', doctorSchema);

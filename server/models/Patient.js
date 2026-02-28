const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
    _id: { type: String, required: true }, // UUID
    name: { type: String, required: true },
    age: { type: Number, min: 1, default: null }, // CHECK > 0
    gender: { type: String, enum: ['male', 'female', 'other'], default: 'other' },
    phone: { type: String, default: null }, // 10-digit
    email: { type: String, default: null },
    medical_history: { type: String, default: '[]' },
    no_show_probability: { type: Number, min: 0.0, max: 1.0, default: 0.0 }, // AI score 0.0-1.0
    // Keep old fields for backward compatibility
    no_show_count: { type: Number, default: 0 },
    total_visits: { type: Number, default: 0 },
    created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Patient', patientSchema);

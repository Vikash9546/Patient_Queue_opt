const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    name: { type: String, required: true },
    age: { type: Number, default: null },
    gender: { type: String, default: null },
    phone: { type: String, default: null },
    email: { type: String, default: null },
    medical_history: { type: String, default: '[]' },
    no_show_count: { type: Number, default: 0 },
    total_visits: { type: Number, default: 0 },
    created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Patient', patientSchema);

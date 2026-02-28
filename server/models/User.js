const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    _id: { type: String, required: true }, // UUID
    username: { type: String, required: true, unique: true },
    password_hash: { type: String, required: true }, // Changed from password to password_hash
    role: { type: String, enum: ['receptionist', 'doctor', 'admin'], default: 'receptionist' },
    name: { type: String }, // Keeping name from old schema so it doesn't break app
    created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);

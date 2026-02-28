const mongoose = require('mongoose');

const userActivitySchema = new mongoose.Schema({
    _id: { type: String, required: true }, // UUID
    user_id: { type: String, ref: 'User', required: true }, // unique userId performing the action
    action: { type: String, required: true }, // The route or intent described
    method: { type: String, required: true }, // HTTP method: POST, PUT, DELETE, PATCH
    path: { type: String, required: true }, // The endpoint hitting
    payload: { type: String, default: null }, // JSON stringified payload of their action
    created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('UserActivity', userActivitySchema);

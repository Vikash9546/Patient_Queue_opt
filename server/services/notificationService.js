const { db } = require('../config/database');
const { generateId } = require('../utils/helpers');

function sendNotification({ patientId, doctorId, type, message, channel }) {
    const id = generateId();
    db.prepare(`INSERT INTO notifications (id, patient_id, doctor_id, type, message, channel) VALUES (?, ?, ?, ?, ?, ?)`)
        .run(id, patientId || null, doctorId || null, type, message, channel || 'app');

    console.log(`📱 Notification [${type}]: ${message}`);
    return { id, type, message };
}

function getNotifications(userId, unreadOnly = false) {
    let query = `SELECT * FROM notifications WHERE (patient_id = ? OR doctor_id = ?)`;
    if (unreadOnly) query += ` AND is_read = 0`;
    query += ` ORDER BY sent_at DESC LIMIT 50`;
    return db.prepare(query).all(userId, userId);
}

function markAsRead(notificationId) {
    db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(notificationId);
}

function notifyQueueUpdate(doctorId, message) {
    return sendNotification({
        doctorId,
        type: 'queue_update',
        message,
        channel: 'app'
    });
}

function notifyEmergency(doctorId, patientName) {
    return sendNotification({
        doctorId,
        type: 'emergency',
        message: `🚨 EMERGENCY: ${patientName} requires immediate attention!`,
        channel: 'app'
    });
}

function notifyPatientWaitUpdate(patientId, waitMins) {
    return sendNotification({
        patientId,
        type: 'wait_update',
        message: `Your estimated wait time is now ${waitMins} minutes.`,
        channel: 'sms'
    });
}

module.exports = {
    sendNotification, getNotifications, markAsRead,
    notifyQueueUpdate, notifyEmergency, notifyPatientWaitUpdate
};

const Notification = require('../models/Notification');
const { generateId } = require('../utils/helpers');

async function sendNotification({ patientId, doctorId, type, message, channel }) {
    const id = generateId();
    await Notification.create({
        _id: id,
        patient_id: patientId || null,
        doctor_id: doctorId || null,
        type,
        message,
        channel: channel || 'app'
    });

    console.log(`📱 Notification [${type}]: ${message}`);
    return { id, type, message };
}

async function getNotifications(userId, unreadOnly = false) {
    const filter = {
        $or: [{ patient_id: userId }, { doctor_id: userId }]
    };
    if (unreadOnly) filter.is_read = 0;

    return await Notification.find(filter).sort({ sent_at: -1 }).limit(50);
}

async function markAsRead(notificationId) {
    await Notification.findByIdAndUpdate(notificationId, { is_read: 1 });
}

async function notifyQueueUpdate(doctorId, message) {
    return await sendNotification({
        doctorId,
        type: 'queue_update',
        message,
        channel: 'app'
    });
}

async function notifyEmergency(doctorId, patientName) {
    return await sendNotification({
        doctorId,
        type: 'emergency',
        message: `🚨 EMERGENCY: ${patientName} requires immediate attention!`,
        channel: 'app'
    });
}

async function notifyPatientWaitUpdate(patientId, waitMins) {
    return await sendNotification({
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

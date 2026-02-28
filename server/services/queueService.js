const { db } = require('../config/database');
const { generateId } = require('../utils/helpers');

function getQueue(doctorId) {
    let query = `SELECT q.*, p.name as patient_name, p.age as patient_age, p.phone as patient_phone,
    a.symptoms, a.urgency_level, a.estimated_duration, a.scheduled_time,
    d.name as doctor_name, d.specialty as doctor_specialty
    FROM queue_entries q
    JOIN patients p ON q.patient_id = p.id
    JOIN doctors d ON q.doctor_id = d.id
    LEFT JOIN appointments a ON q.appointment_id = a.id
    WHERE q.status IN ('waiting', 'in_consultation')`;

    if (doctorId) {
        query += ` AND q.doctor_id = ?`;
        query += ` ORDER BY q.position ASC`;
        return db.prepare(query).all(doctorId);
    }
    query += ` ORDER BY q.doctor_id, q.position ASC`;
    return db.prepare(query).all();
}

function addToQueue({ appointmentId, patientId, doctorId, priority }) {
    const currentQueue = getQueue(doctorId);
    const waitingCount = currentQueue.filter(q => q.status === 'waiting').length;

    let position;
    if (priority === 'emergency') {
        // Insert after current consultation
        position = 1;
        // Shift everyone else down
        db.prepare(`UPDATE queue_entries SET position = position + 1 WHERE doctor_id = ? AND status = 'waiting'`).run(doctorId);
    } else if (priority === 'high') {
        // Insert after emergencies and current high priority
        const highPriorityCount = currentQueue.filter(q => q.priority === 'emergency' || q.priority === 'high').length;
        position = Math.max(highPriorityCount, 1);
        db.prepare(`UPDATE queue_entries SET position = position + 1 WHERE doctor_id = ? AND status = 'waiting' AND position >= ?`).run(doctorId, position);
    } else {
        position = waitingCount + 1;
    }

    // Calculate estimated wait
    const estimatedWait = calculateWaitTime(doctorId, position);

    const id = generateId();
    db.prepare(`INSERT INTO queue_entries (id, appointment_id, patient_id, doctor_id, position, status, priority, estimated_wait_mins)
    VALUES (?, ?, ?, ?, ?, 'waiting', ?, ?)`).run(id, appointmentId, patientId, doctorId, position, priority || 'normal', estimatedWait);

    return { id, position, estimated_wait_mins: estimatedWait };
}

function removeFromQueue(queueId) {
    const entry = db.prepare('SELECT * FROM queue_entries WHERE id = ?').get(queueId);
    if (!entry) return null;

    db.prepare(`UPDATE queue_entries SET status = 'completed', completed_at = datetime('now') WHERE id = ?`).run(queueId);

    // Shift positions
    db.prepare(`UPDATE queue_entries SET position = position - 1 WHERE doctor_id = ? AND position > ? AND status = 'waiting'`)
        .run(entry.doctor_id, entry.position);

    recalculateWaitTimes(entry.doctor_id);
    return entry;
}

function moveToNext(doctorId) {
    // Complete current consultation
    const current = db.prepare(`SELECT * FROM queue_entries WHERE doctor_id = ? AND status = 'in_consultation'`).get(doctorId);
    if (current) {
        db.prepare(`UPDATE queue_entries SET status = 'completed', completed_at = datetime('now') WHERE id = ?`).run(current.id);
        db.prepare(`UPDATE appointments SET status = 'completed', actual_end = datetime('now') WHERE id = ?`).run(current.appointment_id);
    }

    // Call next patient
    const next = db.prepare(`SELECT * FROM queue_entries WHERE doctor_id = ? AND status = 'waiting' ORDER BY position ASC LIMIT 1`).get(doctorId);
    if (next) {
        db.prepare(`UPDATE queue_entries SET status = 'in_consultation', called_at = datetime('now') WHERE id = ?`).run(next.id);
        db.prepare(`UPDATE appointments SET status = 'in_progress', actual_start = datetime('now') WHERE id = ?`).run(next.appointment_id);
        // Shift positions
        db.prepare(`UPDATE queue_entries SET position = position - 1 WHERE doctor_id = ? AND status = 'waiting'`).run(doctorId);
        recalculateWaitTimes(doctorId);
        return next;
    }
    return null;
}

function reorderQueue(doctorId, newOrder) {
    const updateStmt = db.prepare('UPDATE queue_entries SET position = ? WHERE id = ?');
    const transaction = db.transaction((order) => {
        order.forEach((id, index) => {
            updateStmt.run(index + 1, id);
        });
    });
    transaction(newOrder);
    recalculateWaitTimes(doctorId);
}

function rebalanceQueue(doctorId) {
    const queue = getQueue(doctorId);
    const waiting = queue.filter(q => q.status === 'waiting');

    // Sort by priority then by original position
    const priorityOrder = { emergency: 0, high: 1, normal: 2 };
    waiting.sort((a, b) => {
        const priDiff = (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
        if (priDiff !== 0) return priDiff;
        return a.position - b.position;
    });

    const updateStmt = db.prepare('UPDATE queue_entries SET position = ? WHERE id = ?');
    waiting.forEach((entry, index) => {
        updateStmt.run(index + 1, entry.id);
    });

    recalculateWaitTimes(doctorId);
    return getQueue(doctorId);
}

function calculateWaitTime(doctorId, position) {
    const doctor = db.prepare('SELECT avg_consultation_mins FROM doctors WHERE id = ?').get(doctorId);
    const avgTime = doctor ? doctor.avg_consultation_mins : 15;

    // Current consultation remaining time (estimate half done)
    const inConsultation = db.prepare(`SELECT * FROM queue_entries WHERE doctor_id = ? AND status = 'in_consultation'`).get(doctorId);
    let waitMins = 0;
    if (inConsultation) {
        waitMins += Math.floor(avgTime / 2);
    }
    waitMins += (position - 1) * avgTime;
    return waitMins;
}

function recalculateWaitTimes(doctorId) {
    const queue = db.prepare(`SELECT id, position FROM queue_entries WHERE doctor_id = ? AND status = 'waiting' ORDER BY position`).all(doctorId);
    const doctor = db.prepare('SELECT avg_consultation_mins FROM doctors WHERE id = ?').get(doctorId);
    const avgTime = doctor ? doctor.avg_consultation_mins : 15;

    const updateStmt = db.prepare('UPDATE queue_entries SET estimated_wait_mins = ? WHERE id = ?');
    queue.forEach((entry) => {
        const wait = entry.position * avgTime;
        updateStmt.run(wait, entry.id);
    });
}

module.exports = { getQueue, addToQueue, removeFromQueue, moveToNext, reorderQueue, rebalanceQueue, calculateWaitTime };

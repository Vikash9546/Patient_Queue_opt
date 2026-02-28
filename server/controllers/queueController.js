const { db } = require('../config/database');
const { generateId } = require('../utils/helpers');
const queueService = require('../services/queueService');
const aiService = require('../services/aiService');
const notificationService = require('../services/notificationService');

exports.getQueue = (req, res) => {
    const doctorId = req.query.doctor_id;
    const queue = queueService.getQueue(doctorId);
    res.json({ success: true, data: queue });
};

exports.addWalkIn = async (req, res) => {
    try {
        const { patient_name, patient_age, patient_phone, symptoms, doctor_id, medical_history } = req.body;

        // AI Triage
        const triageResult = await aiService.triagePatient({
            symptoms: symptoms || '',
            age: patient_age || 30,
            medicalHistory: medical_history
        });

        // AI Duration estimate
        const durationResult = await aiService.estimateConsultationDuration({
            symptoms: symptoms || '',
            age: patient_age || 30,
            urgency: triageResult.urgency
        });

        // Create patient
        const patientId = generateId();
        db.prepare('INSERT INTO patients (id, name, age, phone, medical_history) VALUES (?, ?, ?, ?, ?)')
            .run(patientId, patient_name, patient_age || null, patient_phone || null, JSON.stringify(medical_history || []));

        // Create appointment
        const appointmentId = generateId();
        db.prepare(`INSERT INTO appointments (id, patient_id, doctor_id, scheduled_time, estimated_duration, status, urgency_level, symptoms, is_walkin)
      VALUES (?, ?, ?, datetime('now'), ?, 'checked_in', ?, ?, 1)`)
            .run(appointmentId, patientId, doctor_id, durationResult.estimated_minutes, triageResult.urgency, symptoms || '');

        // Add to queue with priority
        const priority = triageResult.urgency === 'emergency' ? 'emergency' :
            triageResult.urgency === 'high' ? 'high' : 'normal';

        const queueEntry = queueService.addToQueue({
            appointmentId, patientId, doctorId: doctor_id, priority
        });

        // Broadcast update
        if (global.broadcast) global.broadcast({ type: 'queue_update', data: queueService.getQueue(doctor_id) });

        res.json({
            success: true,
            data: {
                patient: { id: patientId, name: patient_name },
                appointment: { id: appointmentId },
                queue: queueEntry,
                triage: triageResult,
                estimated_duration: durationResult.estimated_minutes
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.addEmergency = async (req, res) => {
    try {
        const { patient_name, patient_age, patient_phone, symptoms, doctor_id } = req.body;

        const patientId = generateId();
        db.prepare('INSERT INTO patients (id, name, age, phone) VALUES (?, ?, ?, ?)')
            .run(patientId, patient_name, patient_age || null, patient_phone || null);

        const appointmentId = generateId();
        db.prepare(`INSERT INTO appointments (id, patient_id, doctor_id, scheduled_time, estimated_duration, status, urgency_level, symptoms, is_walkin)
      VALUES (?, ?, ?, datetime('now'), 30, 'checked_in', 'emergency', ?, 1)`)
            .run(appointmentId, patientId, doctor_id, symptoms || 'Emergency');

        const queueEntry = queueService.addToQueue({
            appointmentId, patientId, doctorId: doctor_id, priority: 'emergency'
        });

        // Notify doctor
        notificationService.notifyEmergency(doctor_id, patient_name);

        // Rebalance queue
        queueService.rebalanceQueue(doctor_id);

        // Broadcast update
        if (global.broadcast) {
            global.broadcast({ type: 'emergency', data: { patient_name, doctor_id } });
            global.broadcast({ type: 'queue_update', data: queueService.getQueue(doctor_id) });
        }

        res.json({
            success: true,
            data: {
                patient: { id: patientId, name: patient_name },
                queue: queueEntry,
                message: '🚨 Emergency patient added. Doctor notified.'
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.reorder = (req, res) => {
    const { doctor_id, order } = req.body;
    queueService.reorderQueue(doctor_id, order);

    if (global.broadcast) global.broadcast({ type: 'queue_update', data: queueService.getQueue(doctor_id) });

    res.json({ success: true, message: 'Queue reordered' });
};

exports.rebalance = (req, res) => {
    const { doctor_id } = req.body;
    const doctors = doctor_id ? [doctor_id] : db.prepare('SELECT id FROM doctors').all().map(d => d.id);

    doctors.forEach(id => {
        queueService.rebalanceQueue(id);
    });

    if (global.broadcast) global.broadcast({ type: 'queue_update', data: queueService.getQueue(doctor_id) });

    res.json({ success: true, message: 'Queue rebalanced' });
};

exports.callNext = (req, res) => {
    const { doctor_id } = req.body;
    const next = queueService.moveToNext(doctor_id);

    if (global.broadcast) global.broadcast({ type: 'queue_update', data: queueService.getQueue(doctor_id) });

    if (next) {
        res.json({ success: true, data: next, message: 'Next patient called' });
    } else {
        res.json({ success: true, data: null, message: 'No more patients in queue' });
    }
};

exports.checkIn = (req, res) => {
    const { appointment_id, doctor_id } = req.body;

    db.prepare("UPDATE appointments SET status = 'checked_in' WHERE id = ?").run(appointment_id);

    const appt = db.prepare('SELECT * FROM appointments WHERE id = ?').get(appointment_id);
    if (appt) {
        const queueEntry = queueService.addToQueue({
            appointmentId: appointment_id,
            patientId: appt.patient_id,
            doctorId: appt.doctor_id,
            priority: appt.urgency_level === 'high' ? 'high' : 'normal'
        });

        if (global.broadcast) global.broadcast({ type: 'queue_update', data: queueService.getQueue(appt.doctor_id) });

        res.json({ success: true, data: queueEntry });
    } else {
        res.status(404).json({ success: false, error: 'Appointment not found' });
    }
};

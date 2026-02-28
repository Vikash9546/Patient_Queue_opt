const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const QueueEntry = require('../models/QueueEntry');
const { generateId } = require('../utils/helpers');
const queueService = require('../services/queueService');
const aiService = require('../services/aiService');
const notificationService = require('../services/notificationService');

exports.getQueue = async (req, res) => {
    try {
        const doctorId = req.query.doctor_id;
        const queue = await queueService.getQueue(doctorId);
        res.json({ success: true, data: queue });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.addWalkIn = async (req, res) => {
    try {
        const { patient_name, patient_age, patient_phone, symptoms, doctor_id, medical_history, manual_urgency } = req.body;

        let triageResult = {};

        if (manual_urgency) {
            // Use manually selected urgency
            triageResult = {
                urgency: manual_urgency,
                explanation: `Urgency level manually set to ${manual_urgency.toUpperCase()} by receptionist.`
            };
        } else {
            // AI Triage
            triageResult = await aiService.triagePatient({
                symptoms: symptoms || '',
                age: patient_age || 30,
                medicalHistory: medical_history
            });
        }

        // AI Duration estimate (still runs even for manual to guess time)
        const durationResult = await aiService.estimateConsultationDuration({
            symptoms: symptoms || '',
            age: patient_age || 30,
            urgency: triageResult.urgency
        });

        // Create patient
        const patientId = generateId();
        await Patient.create({
            _id: patientId, name: patient_name,
            age: patient_age || null, phone: patient_phone || null,
            medical_history: JSON.stringify(medical_history || [])
        });

        // Create appointment
        const appointmentId = generateId();
        await Appointment.create({
            _id: appointmentId,
            patient_id: patientId,
            doctor_id,
            scheduled_time: new Date(),
            estimated_duration: durationResult.estimated_minutes,
            status: 'checked_in',
            urgency_level: triageResult.urgency,
            symptoms: symptoms || '',
            is_walkin: 1
        });

        // Add to queue with priority
        const priority = triageResult.urgency === 'emergency' ? 'emergency' :
            triageResult.urgency === 'high' ? 'high' : 'normal';

        const queueEntry = await queueService.addToQueue({
            appointmentId, patientId, doctorId: doctor_id, priority
        });

        // Broadcast update
        if (global.broadcast) {
            const queueData = await queueService.getQueue(doctor_id);
            global.broadcast({ type: 'queue_update', data: queueData });
        }

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
        await Patient.create({
            _id: patientId, name: patient_name,
            age: patient_age || null, phone: patient_phone || null
        });

        const appointmentId = generateId();
        await Appointment.create({
            _id: appointmentId,
            patient_id: patientId,
            doctor_id,
            scheduled_time: new Date(),
            estimated_duration: 30,
            status: 'checked_in',
            urgency_level: 'emergency',
            symptoms: symptoms || 'Emergency',
            is_walkin: 1
        });

        const queueEntry = await queueService.addToQueue({
            appointmentId, patientId, doctorId: doctor_id, priority: 'emergency'
        });

        // Notify doctor
        await notificationService.notifyEmergency(doctor_id, patient_name);

        // Rebalance queue
        await queueService.rebalanceQueue(doctor_id);

        // Broadcast update
        if (global.broadcast) {
            global.broadcast({ type: 'emergency', data: { patient_name, doctor_id } });
            const queueData = await queueService.getQueue(doctor_id);
            global.broadcast({ type: 'queue_update', data: queueData });
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

exports.reorder = async (req, res) => {
    try {
        const { doctor_id, order } = req.body;
        await queueService.reorderQueue(doctor_id, order);

        if (global.broadcast) {
            const queueData = await queueService.getQueue(doctor_id);
            global.broadcast({ type: 'queue_update', data: queueData });
        }

        res.json({ success: true, message: 'Queue reordered' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.rebalance = async (req, res) => {
    try {
        const { doctor_id } = req.body;
        let doctorIds;
        if (doctor_id) {
            doctorIds = [doctor_id];
        } else {
            const doctors = await Doctor.find().select('_id');
            doctorIds = doctors.map(d => d._id);
        }

        for (const id of doctorIds) {
            await queueService.rebalanceQueue(id);
        }

        if (global.broadcast) {
            const queueData = await queueService.getQueue(doctor_id);
            global.broadcast({ type: 'queue_update', data: queueData });
        }

        res.json({ success: true, message: 'Queue rebalanced' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.callNext = async (req, res) => {
    try {
        const { doctor_id } = req.body;
        const next = await queueService.moveToNext(doctor_id);

        if (global.broadcast) {
            const queueData = await queueService.getQueue(doctor_id);
            global.broadcast({ type: 'queue_update', data: queueData });
            if (next) {
                // Get patient name for the notification
                const patient = await Patient.findById(next.patient_id);
                global.broadcast({
                    type: 'patient_called', data: {
                        patient_name: patient?.name || 'Unknown',
                        doctor_id,
                        queue_entry: next
                    }
                });
            }
        }

        if (next) {
            res.json({ success: true, data: next, message: 'Next patient called' });
        } else {
            res.json({ success: true, data: null, message: 'No more patients in queue' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.checkIn = async (req, res) => {
    try {
        const { appointment_id, doctor_id } = req.body;

        await Appointment.findByIdAndUpdate(appointment_id, { status: 'checked_in' });

        const appt = await Appointment.findById(appointment_id);
        if (appt) {
            const queueEntry = await queueService.addToQueue({
                appointmentId: appointment_id,
                patientId: appt.patient_id,
                doctorId: appt.doctor_id,
                priority: appt.urgency_level === 'high' ? 'high' : 'normal'
            });

            if (global.broadcast) {
                const queueData = await queueService.getQueue(appt.doctor_id);
                global.broadcast({ type: 'queue_update', data: queueData });
            }

            res.json({ success: true, data: queueEntry });
        } else {
            res.status(404).json({ success: false, error: 'Appointment not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const QueueEntry = require('../models/QueueEntry');
const { generateId, randomChoice, weightedChoice, SYMPTOMS_LIST, NAMES, URGENCY_LEVELS, URGENCY_WEIGHTS } = require('../utils/helpers');
const queueService = require('../services/queueService');
const aiService = require('../services/aiService');

exports.simulate = async (req, res) => {
    try {
        const count = req.body.count || 50;
        const doctorDocs = await Doctor.find().select('_id');
        const doctorIds = doctorDocs.map(d => d._id);
        const results = { patients: 0, walkins: 0, emergencies: 0, noShows: 0 };

        for (let i = 0; i < count; i++) {
            const name = randomChoice(NAMES) + ' ' + Math.floor(Math.random() * 100);
            const age = Math.floor(Math.random() * 70) + 5;
            const symptoms = [];
            const symptomCount = Math.floor(Math.random() * 3) + 1;
            for (let j = 0; j < symptomCount; j++) {
                symptoms.push(randomChoice(SYMPTOMS_LIST));
            }
            const urgency = weightedChoice(URGENCY_LEVELS, URGENCY_WEIGHTS);
            const doctorId = randomChoice(doctorIds);
            const isWalkIn = Math.random() > 0.5;
            const isNoShow = Math.random() > 0.85;

            // Create patient
            const patientId = generateId();
            await Patient.create({
                _id: patientId, name, age,
                gender: Math.random() > 0.5 ? 'Male' : 'Female',
                phone: `99${Math.floor(Math.random() * 100000000)}`
            });

            // Estimate duration using fallback (faster for simulation)
            let duration = 15;
            if (urgency === 'emergency') duration = 30;
            else if (urgency === 'high') duration = 25;
            else if (urgency === 'medium') duration = 20;

            // Create appointment
            const appointmentId = generateId();
            const hour = 9 + Math.floor(Math.random() * 8);
            const minute = Math.floor(Math.random() * 4) * 15;
            const scheduledTime = new Date();
            scheduledTime.setHours(hour, minute, 0, 0);

            if (isNoShow) {
                await Appointment.create({
                    _id: appointmentId, patient_id: patientId, doctor_id: doctorId,
                    scheduled_time: scheduledTime, estimated_duration: duration,
                    status: 'no_show', urgency_level: urgency,
                    symptoms: symptoms.join(', '), is_walkin: isWalkIn ? 1 : 0
                });
                results.noShows++;
            } else {
                await Appointment.create({
                    _id: appointmentId, patient_id: patientId, doctor_id: doctorId,
                    scheduled_time: scheduledTime, estimated_duration: duration,
                    status: 'checked_in', urgency_level: urgency,
                    symptoms: symptoms.join(', '), is_walkin: isWalkIn ? 1 : 0
                });

                // Add to queue
                const priority = urgency === 'emergency' ? 'emergency' : urgency === 'high' ? 'high' : 'normal';
                await queueService.addToQueue({ appointmentId, patientId, doctorId, priority });

                if (urgency === 'emergency') results.emergencies++;
                if (isWalkIn) results.walkins++;
            }

            results.patients++;

            // Broadcast progress
            if (global.broadcast && i % 5 === 0) {
                global.broadcast({ type: 'simulation_progress', data: { current: i + 1, total: count } });
            }
        }

        // Rebalance all queues
        for (const id of doctorIds) {
            await queueService.rebalanceQueue(id);
        }

        if (global.broadcast) {
            global.broadcast({ type: 'simulation_complete', data: results });
            const queueData = await queueService.getQueue();
            global.broadcast({ type: 'queue_update', data: queueData });
        }

        res.json({ success: true, data: results, message: `Simulated ${count} patients` });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.reset = async (req, res) => {
    try {
        const defaultQueueIds = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7'];
        const defaultAppointmentIds = ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8'];
        const defaultPatientIds = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10'];

        await QueueEntry.deleteMany({ _id: { $nin: defaultQueueIds } });
        await Appointment.deleteMany({ _id: { $nin: defaultAppointmentIds } });
        await Patient.deleteMany({ _id: { $nin: defaultPatientIds } });
        const Notification = require('../models/Notification');
        await Notification.deleteMany({});

        if (global.broadcast) {
            const queueData = await queueService.getQueue();
            global.broadcast({ type: 'queue_update', data: queueData });
        }

        res.json({ success: true, message: 'Demo data reset to defaults' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

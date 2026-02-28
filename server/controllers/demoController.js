const { db } = require('../config/database');
const { generateId, randomChoice, weightedChoice, SYMPTOMS_LIST, NAMES, URGENCY_LEVELS, URGENCY_WEIGHTS } = require('../utils/helpers');
const queueService = require('../services/queueService');
const aiService = require('../services/aiService');

exports.simulate = async (req, res) => {
    const count = req.body.count || 50;
    const doctorIds = db.prepare('SELECT id FROM doctors').all().map(d => d.id);
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
        db.prepare('INSERT INTO patients (id, name, age, gender, phone) VALUES (?, ?, ?, ?, ?)')
            .run(patientId, name, age, Math.random() > 0.5 ? 'Male' : 'Female', `99${Math.floor(Math.random() * 100000000)}`);

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
            db.prepare(`INSERT INTO appointments (id, patient_id, doctor_id, scheduled_time, estimated_duration, status, urgency_level, symptoms, is_walkin)
        VALUES (?, ?, ?, ?, ?, 'no_show', ?, ?, ?)`)
                .run(appointmentId, patientId, doctorId, scheduledTime.toISOString(), duration, urgency, symptoms.join(', '), isWalkIn ? 1 : 0);
            results.noShows++;
        } else {
            db.prepare(`INSERT INTO appointments (id, patient_id, doctor_id, scheduled_time, estimated_duration, status, urgency_level, symptoms, is_walkin)
        VALUES (?, ?, ?, ?, ?, 'checked_in', ?, ?, ?)`)
                .run(appointmentId, patientId, doctorId, scheduledTime.toISOString(), duration, urgency, symptoms.join(', '), isWalkIn ? 1 : 0);

            // Add to queue
            const priority = urgency === 'emergency' ? 'emergency' : urgency === 'high' ? 'high' : 'normal';
            queueService.addToQueue({ appointmentId, patientId, doctorId, priority });

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
    doctorIds.forEach(id => queueService.rebalanceQueue(id));

    if (global.broadcast) {
        global.broadcast({ type: 'simulation_complete', data: results });
        global.broadcast({ type: 'queue_update', data: queueService.getQueue() });
    }

    res.json({ success: true, data: results, message: `Simulated ${count} patients` });
};

exports.reset = (req, res) => {
    db.prepare("DELETE FROM queue_entries WHERE id NOT IN ('q1','q2','q3','q4','q5','q6','q7')").run();
    db.prepare("DELETE FROM appointments WHERE id NOT IN ('a1','a2','a3','a4','a5','a6','a7','a8')").run();
    db.prepare("DELETE FROM patients WHERE id NOT IN ('p1','p2','p3','p4','p5','p6','p7','p8','p9','p10')").run();
    db.prepare("DELETE FROM notifications").run();

    if (global.broadcast) global.broadcast({ type: 'queue_update', data: queueService.getQueue() });

    res.json({ success: true, message: 'Demo data reset to defaults' });
};

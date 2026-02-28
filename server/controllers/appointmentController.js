const { db } = require('../config/database');
const { generateId } = require('../utils/helpers');
const aiService = require('../services/aiService');
const queueService = require('../services/queueService');

exports.book = async (req, res) => {
    try {
        const { patient_id, patient_name, patient_age, patient_phone, doctor_id, scheduled_time, symptoms, medical_history, urgency_level } = req.body;

        // Create patient if new
        let patientId = patient_id;
        if (!patientId && patient_name) {
            patientId = generateId();
            db.prepare('INSERT INTO patients (id, name, age, phone, medical_history) VALUES (?, ?, ?, ?, ?)')
                .run(patientId, patient_name, patient_age || null, patient_phone || null, JSON.stringify(medical_history || []));
        }

        // AI: Estimate consultation duration
        const durationResult = await aiService.estimateConsultationDuration({
            symptoms: symptoms || '',
            age: patient_age || 30,
            medicalHistory: medical_history,
            urgency: urgency_level || 'low'
        });

        // AI: Predict no-show
        const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(patientId);
        const noShowResult = await aiService.predictNoShow({
            noShowCount: patient?.no_show_count || 0,
            totalVisits: patient?.total_visits || 0,
            dayOfWeek: new Date().getDay(),
            timeOfDay: scheduled_time,
            age: patient_age || 30
        });

        const appointmentId = generateId();
        const scheduledDateTime = scheduled_time || new Date(Date.now() + 3600000).toISOString();

        db.prepare(`INSERT INTO appointments (id, patient_id, doctor_id, scheduled_time, estimated_duration, status, urgency_level, symptoms, ai_notes, no_show_score)
      VALUES (?, ?, ?, ?, ?, 'scheduled', ?, ?, ?, ?)`)
            .run(appointmentId, patientId, doctor_id, scheduledDateTime,
                durationResult.estimated_minutes, urgency_level || 'low', symptoms || '',
                JSON.stringify({ duration_reasoning: durationResult.reasoning }),
                noShowResult.no_show_probability);

        // Update patient visit count
        db.prepare('UPDATE patients SET total_visits = total_visits + 1 WHERE id = ?').run(patientId);

        const appointment = db.prepare(`SELECT a.*, p.name as patient_name, d.name as doctor_name
      FROM appointments a JOIN patients p ON a.patient_id = p.id JOIN doctors d ON a.doctor_id = d.id WHERE a.id = ?`).get(appointmentId);

        res.json({
            success: true,
            data: {
                appointment,
                ai_insights: {
                    estimated_duration: durationResult.estimated_minutes,
                    duration_confidence: durationResult.confidence,
                    duration_reasoning: durationResult.reasoning,
                    no_show_probability: noShowResult.no_show_probability,
                    no_show_risk: noShowResult.risk_level
                }
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getAll = (req, res) => {
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const doctorId = req.query.doctor_id;

    let query = `SELECT a.*, p.name as patient_name, p.age as patient_age, d.name as doctor_name, d.specialty as doctor_specialty
    FROM appointments a
    JOIN patients p ON a.patient_id = p.id
    JOIN doctors d ON a.doctor_id = d.id
    WHERE date(a.scheduled_time) = ?`;

    const params = [date];
    if (doctorId) {
        query += ` AND a.doctor_id = ?`;
        params.push(doctorId);
    }
    query += ` ORDER BY a.scheduled_time`;

    const appointments = db.prepare(query).all(...params);
    res.json({ success: true, data: appointments });
};

exports.getById = (req, res) => {
    const appointment = db.prepare(`SELECT a.*, p.name as patient_name, d.name as doctor_name
    FROM appointments a JOIN patients p ON a.patient_id = p.id JOIN doctors d ON a.doctor_id = d.id
    WHERE a.id = ?`).get(req.params.id);

    if (!appointment) return res.status(404).json({ success: false, error: 'Appointment not found' });
    res.json({ success: true, data: appointment });
};

exports.update = (req, res) => {
    const { status, scheduled_time, urgency_level } = req.body;
    const existing = db.prepare('SELECT * FROM appointments WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Appointment not found' });

    db.prepare('UPDATE appointments SET status = ?, scheduled_time = ?, urgency_level = ? WHERE id = ?')
        .run(status || existing.status, scheduled_time || existing.scheduled_time,
            urgency_level || existing.urgency_level, req.params.id);

    res.json({ success: true, message: 'Appointment updated' });
};

exports.cancel = (req, res) => {
    db.prepare("UPDATE appointments SET status = 'cancelled' WHERE id = ?").run(req.params.id);

    // Remove from queue
    const queueEntry = db.prepare('SELECT * FROM queue_entries WHERE appointment_id = ?').get(req.params.id);
    if (queueEntry) {
        queueService.removeFromQueue(queueEntry.id);
    }

    res.json({ success: true, message: 'Appointment cancelled' });
};

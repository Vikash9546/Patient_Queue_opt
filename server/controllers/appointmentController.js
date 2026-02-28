const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
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
            await Patient.create({
                _id: patientId, name: patient_name,
                age: patient_age || null, phone: patient_phone || null,
                medical_history: JSON.stringify(medical_history || [])
            });
        }

        // AI: Estimate consultation duration
        const durationResult = await aiService.estimateConsultationDuration({
            symptoms: symptoms || '',
            age: patient_age || 30,
            medicalHistory: medical_history,
            urgency: urgency_level || 'low'
        });

        // AI: Predict no-show
        const patient = await Patient.findById(patientId);
        const noShowResult = await aiService.predictNoShow({
            noShowCount: patient?.no_show_count || 0,
            totalVisits: patient?.total_visits || 0,
            dayOfWeek: new Date().getDay(),
            timeOfDay: scheduled_time,
            age: patient_age || 30
        });

        const appointmentId = generateId();
        const scheduledDateTime = scheduled_time || new Date(Date.now() + 3600000).toISOString();

        await Appointment.create({
            _id: appointmentId,
            patient_id: patientId,
            doctor_id,
            scheduled_time: new Date(scheduledDateTime),
            estimated_duration: durationResult.estimated_minutes,
            status: 'scheduled',
            urgency_level: urgency_level || 'low',
            symptoms: symptoms || '',
            ai_notes: JSON.stringify({ duration_reasoning: durationResult.reasoning }),
            no_show_score: noShowResult.no_show_probability
        });

        // Update patient visit count
        await Patient.findByIdAndUpdate(patientId, { $inc: { total_visits: 1 } });

        // Fetch the appointment with joined data
        const appointment = await Appointment.findById(appointmentId);
        const patientData = await Patient.findById(appointment.patient_id);
        const doctorData = await Doctor.findById(appointment.doctor_id);

        const appointmentResult = {
            ...appointment.toObject(), id: appointment._id,
            patient_name: patientData ? patientData.name : 'Unknown',
            doctor_name: doctorData ? doctorData.name : 'Unknown'
        };

        res.json({
            success: true,
            data: {
                appointment: appointmentResult,
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

exports.getAll = async (req, res) => {
    try {
        const date = req.query.date || new Date().toISOString().split('T')[0];
        const doctorId = req.query.doctor_id;

        const startOfDay = new Date(date + 'T00:00:00.000Z');
        const endOfDay = new Date(date + 'T23:59:59.999Z');

        const filter = { scheduled_time: { $gte: startOfDay, $lte: endOfDay } };
        if (doctorId) filter.doctor_id = doctorId;

        const appointments = await Appointment.find(filter).sort({ scheduled_time: 1 });

        // Populate patient and doctor names
        const populatedAppointments = await Promise.all(appointments.map(async (a) => {
            const patient = await Patient.findById(a.patient_id);
            const doctor = await Doctor.findById(a.doctor_id);
            return {
                ...a.toObject(), id: a._id,
                patient_name: patient ? patient.name : 'Unknown',
                patient_age: patient ? patient.age : null,
                doctor_name: doctor ? doctor.name : 'Unknown',
                doctor_specialty: doctor ? doctor.specialty : ''
            };
        }));

        res.json({ success: true, data: populatedAppointments });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getById = async (req, res) => {
    try {
        const appointment = await Appointment.findById(req.params.id);
        if (!appointment) return res.status(404).json({ success: false, error: 'Appointment not found' });

        const patient = await Patient.findById(appointment.patient_id);
        const doctor = await Doctor.findById(appointment.doctor_id);

        res.json({
            success: true,
            data: {
                ...appointment.toObject(), id: appointment._id,
                patient_name: patient ? patient.name : 'Unknown',
                doctor_name: doctor ? doctor.name : 'Unknown'
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.update = async (req, res) => {
    try {
        const { status, scheduled_time, urgency_level } = req.body;
        const existing = await Appointment.findById(req.params.id);
        if (!existing) return res.status(404).json({ success: false, error: 'Appointment not found' });

        await Appointment.findByIdAndUpdate(req.params.id, {
            status: status || existing.status,
            scheduled_time: scheduled_time ? new Date(scheduled_time) : existing.scheduled_time,
            urgency_level: urgency_level || existing.urgency_level
        });

        res.json({ success: true, message: 'Appointment updated' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.cancel = async (req, res) => {
    try {
        await Appointment.findByIdAndUpdate(req.params.id, { status: 'cancelled' });

        // Remove from queue
        const queueEntry = await require('../models/QueueEntry').findOne({ appointment_id: req.params.id });
        if (queueEntry) {
            await queueService.removeFromQueue(queueEntry._id);
        }

        res.json({ success: true, message: 'Appointment cancelled' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

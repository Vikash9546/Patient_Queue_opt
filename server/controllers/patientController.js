const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');
const QueueEntry = require('../models/QueueEntry');
const Doctor = require('../models/Doctor');
const { generateId } = require('../utils/helpers');

// Patient history with enriched data for the Patient History Database page
exports.getHistory = async (req, res) => {
    try {
        const { page = 1, limit = 10, q, urgency, doctor_id, visit_range, sort = 'recent' } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Build patient query
        let patientQuery = {};
        if (q) {
            const regex = new RegExp(q, 'i');
            patientQuery = { $or: [{ name: regex }, { phone: regex }, { _id: regex }] };
        }

        // Get total count
        const totalPatients = await Patient.countDocuments(patientQuery);

        // Get paginated patients
        let sortOpt = { created_at: -1 };
        if (sort === 'name') sortOpt = { name: 1 };
        if (sort === 'visits') sortOpt = { total_visits: -1 };

        const patients = await Patient.find(patientQuery)
            .sort(sortOpt)
            .skip(skip)
            .limit(parseInt(limit));

        // Enrich each patient with history data
        const enriched = await Promise.all(patients.map(async (patient) => {
            const p = patient.toObject();

            // Get appointments for this patient
            const appointments = await Appointment.find({ patient_id: p._id })
                .sort({ scheduled_time: -1 })
                .limit(20);

            // Get queue entries for priority data
            const queueEntries = await QueueEntry.find({ patient_id: p._id })
                .sort({ checked_in_at: -1 })
                .limit(20);

            // Compute common symptoms/reasons
            const symptomCounts = {};
            appointments.forEach(a => {
                if (a.symptoms) {
                    a.symptoms.split(',').map(s => s.trim()).filter(Boolean).forEach(s => {
                        symptomCounts[s] = (symptomCounts[s] || 0) + 1;
                    });
                }
            });
            const commonReasons = Object.entries(symptomCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map(([s]) => s);

            // Compute avg priority score (map urgency to number)
            const urgencyMap = { emergency: 10, high: 8, medium: 5, low: 2, normal: 1 };
            const urgencyScores = appointments.map(a => urgencyMap[a.urgency_level] || 1);
            const avgPriority = urgencyScores.length > 0
                ? parseFloat((urgencyScores.reduce((s, v) => s + v, 0) / urgencyScores.length).toFixed(1))
                : 0;

            // Priority timeline (last 5 entries)
            const priorityTimeline = queueEntries.slice(0, 5).map(q => q.priority || 'normal');

            // Last visit
            const lastAppt = appointments[0];
            const lastVisit = lastAppt ? lastAppt.scheduled_time : null;

            // Assigned doctor (most frequent)
            const doctorCounts = {};
            appointments.forEach(a => { doctorCounts[a.doctor_id] = (doctorCounts[a.doctor_id] || 0) + 1; });
            const topDoctorId = Object.entries(doctorCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
            let assignedDoctor = null;
            if (topDoctorId) {
                const doc = await Doctor.findById(topDoctorId);
                assignedDoctor = doc ? doc.name : null;
            }

            // AI notes from last appointment
            const aiNotes = lastAppt?.ai_notes || null;

            return {
                id: p._id,
                name: p.name,
                age: p.age,
                gender: p.gender,
                phone: p.phone,
                total_visits: p.total_visits,
                no_show_count: p.no_show_count,
                common_reasons: commonReasons,
                avg_priority: avgPriority,
                priority_timeline: priorityTimeline,
                last_visit: lastVisit,
                assigned_doctor: assignedDoctor,
                ai_notes: aiNotes,
                created_at: p.created_at
            };
        }));

        // Apply post-enrichment filters
        let filtered = enriched;

        if (urgency) {
            const urgencyLevels = urgency.split(',');
            const thresholds = { high: 7, medium: 4, standard: 0 };
            filtered = filtered.filter(p => {
                return urgencyLevels.some(u => {
                    if (u === 'high') return p.avg_priority >= thresholds.high;
                    if (u === 'medium') return p.avg_priority >= thresholds.medium && p.avg_priority < thresholds.high;
                    if (u === 'standard') return p.avg_priority < thresholds.medium;
                    return true;
                });
            });
        }

        if (doctor_id) {
            // We'd need to match by doctor name since we already resolved it
            // But for simplicity, keep all
        }

        if (visit_range) {
            const now = new Date();
            let cutoff;
            if (visit_range === '7d') cutoff = new Date(now - 7 * 86400000);
            else if (visit_range === '30d') cutoff = new Date(now - 30 * 86400000);
            else if (visit_range === '90d') cutoff = new Date(now - 90 * 86400000);
            if (cutoff) {
                filtered = filtered.filter(p => p.last_visit && new Date(p.last_visit) >= cutoff);
            }
        }

        res.json({
            success: true,
            data: filtered,
            pagination: {
                total: totalPatients,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(totalPatients / parseInt(limit))
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getAll = async (req, res) => {
    try {
        const patients = await Patient.find().sort({ name: 1 });
        res.json({ success: true, data: patients.map(p => ({ ...p.toObject(), id: p._id })) });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getById = async (req, res) => {
    try {
        const patient = await Patient.findById(req.params.id);
        if (!patient) return res.status(404).json({ success: false, error: 'Patient not found' });

        // Get appointment history
        const appointments = await Appointment.find({ patient_id: req.params.id })
            .sort({ scheduled_time: -1 })
            .limit(10);

        res.json({ success: true, data: { ...patient.toObject(), id: patient._id, appointments } });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.create = async (req, res) => {
    try {
        const { name, age, gender, phone, email, medical_history } = req.body;
        const id = generateId();
        const history = typeof medical_history === 'string' ? medical_history : JSON.stringify(medical_history || []);

        await Patient.create({
            _id: id, name, age: age || null, gender: gender || null,
            phone: phone || null, email: email || null, medical_history: history
        });

        const patient = await Patient.findById(id);
        res.json({ success: true, data: { ...patient.toObject(), id: patient._id } });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.update = async (req, res) => {
    try {
        const { name, age, gender, phone, email, medical_history } = req.body;
        const existing = await Patient.findById(req.params.id);
        if (!existing) return res.status(404).json({ success: false, error: 'Patient not found' });

        await Patient.findByIdAndUpdate(req.params.id, {
            name: name || existing.name,
            age: age || existing.age,
            gender: gender || existing.gender,
            phone: phone || existing.phone,
            email: email || existing.email,
            medical_history: medical_history || existing.medical_history
        });

        const patient = await Patient.findById(req.params.id);
        res.json({ success: true, data: { ...patient.toObject(), id: patient._id } });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.search = async (req, res) => {
    try {
        const { q } = req.query;
        const regex = new RegExp(q, 'i');
        const patients = await Patient.find({
            $or: [{ name: regex }, { phone: regex }]
        });
        res.json({ success: true, data: patients.map(p => ({ ...p.toObject(), id: p._id })) });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');
const { generateId } = require('../utils/helpers');

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

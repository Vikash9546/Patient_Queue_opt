const { db } = require('../config/database');
const { generateId } = require('../utils/helpers');

exports.getAll = (req, res) => {
    const patients = db.prepare('SELECT * FROM patients ORDER BY name').all();
    res.json({ success: true, data: patients });
};

exports.getById = (req, res) => {
    const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(req.params.id);
    if (!patient) return res.status(404).json({ success: false, error: 'Patient not found' });

    // Get appointment history
    const appointments = db.prepare('SELECT * FROM appointments WHERE patient_id = ? ORDER BY scheduled_time DESC LIMIT 10').all(req.params.id);
    res.json({ success: true, data: { ...patient, appointments } });
};

exports.create = (req, res) => {
    const { name, age, gender, phone, email, medical_history } = req.body;
    const id = generateId();
    const history = typeof medical_history === 'string' ? medical_history : JSON.stringify(medical_history || []);

    db.prepare('INSERT INTO patients (id, name, age, gender, phone, email, medical_history) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(id, name, age || null, gender || null, phone || null, email || null, history);

    const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(id);
    res.json({ success: true, data: patient });
};

exports.update = (req, res) => {
    const { name, age, gender, phone, email, medical_history } = req.body;
    const existing = db.prepare('SELECT * FROM patients WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Patient not found' });

    db.prepare('UPDATE patients SET name = ?, age = ?, gender = ?, phone = ?, email = ?, medical_history = ? WHERE id = ?')
        .run(name || existing.name, age || existing.age, gender || existing.gender,
            phone || existing.phone, email || existing.email,
            medical_history || existing.medical_history, req.params.id);

    const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(req.params.id);
    res.json({ success: true, data: patient });
};

exports.search = (req, res) => {
    const { q } = req.query;
    const patients = db.prepare("SELECT * FROM patients WHERE name LIKE ? OR phone LIKE ?").all(`%${q}%`, `%${q}%`);
    res.json({ success: true, data: patients });
};

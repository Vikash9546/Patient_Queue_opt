const { db } = require('../config/database');

exports.getAll = (req, res) => {
    const doctors = db.prepare('SELECT * FROM doctors ORDER BY name').all();
    res.json({ success: true, data: doctors });
};

exports.getById = (req, res) => {
    const doctor = db.prepare('SELECT * FROM doctors WHERE id = ?').get(req.params.id);
    if (!doctor) return res.status(404).json({ success: false, error: 'Doctor not found' });
    res.json({ success: true, data: doctor });
};

exports.getSchedule = (req, res) => {
    const doctorId = req.params.id;
    const date = req.query.date || new Date().toISOString().split('T')[0];

    const appointments = db.prepare(`SELECT a.*, p.name as patient_name, p.age as patient_age
    FROM appointments a JOIN patients p ON a.patient_id = p.id
    WHERE a.doctor_id = ? AND date(a.scheduled_time) = ?
    ORDER BY a.scheduled_time`).all(doctorId, date);

    const doctor = db.prepare('SELECT * FROM doctors WHERE id = ?').get(doctorId);

    res.json({
        success: true,
        data: {
            doctor,
            date,
            appointments,
            total: appointments.length,
            completed: appointments.filter(a => a.status === 'completed').length,
            remaining: appointments.filter(a => ['scheduled', 'checked_in'].includes(a.status)).length
        }
    });
};

exports.getAvailableSlots = (req, res) => {
    const doctorId = req.params.id;
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const doctor = db.prepare('SELECT * FROM doctors WHERE id = ?').get(doctorId);

    if (!doctor) return res.status(404).json({ success: false, error: 'Doctor not found' });

    // Get booked slots
    const booked = db.prepare(`SELECT scheduled_time, estimated_duration FROM appointments
    WHERE doctor_id = ? AND date(scheduled_time) = ? AND status != 'cancelled'`).all(doctorId, date);

    // Generate available 15-min slots
    const slots = [];
    const shiftStart = parseInt(doctor.shift_start.split(':')[0]);
    const shiftEnd = parseInt(doctor.shift_end.split(':')[0]);

    for (let h = shiftStart; h < shiftEnd; h++) {
        for (let m = 0; m < 60; m += 15) {
            const slotTime = `${date}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
            const isBooked = booked.some(b => {
                const bookedTime = new Date(b.scheduled_time).getTime();
                const slotTimeMs = new Date(slotTime).getTime();
                return Math.abs(bookedTime - slotTimeMs) < b.estimated_duration * 60000;
            });
            if (!isBooked) {
                slots.push(slotTime);
            }
        }
    }

    res.json({ success: true, data: slots });
};

exports.updateStatus = (req, res) => {
    const { status } = req.body;
    db.prepare('UPDATE doctors SET status = ? WHERE id = ?').run(status, req.params.id);
    const doctor = db.prepare('SELECT * FROM doctors WHERE id = ?').get(req.params.id);
    res.json({ success: true, data: doctor });
};

exports.getWorkload = (req, res) => {
    const doctorId = req.params.id;
    const doctor = db.prepare('SELECT * FROM doctors WHERE id = ?').get(doctorId);

    // Today's stats
    const today = new Date().toISOString().split('T')[0];
    const todayAppts = db.prepare(`SELECT * FROM appointments WHERE doctor_id = ? AND date(scheduled_time) = ?`).all(doctorId, today);

    const completed = todayAppts.filter(a => a.status === 'completed').length;
    const remaining = todayAppts.filter(a => ['scheduled', 'checked_in', 'in_progress'].includes(a.status)).length;
    const totalDuration = todayAppts.reduce((sum, a) => sum + (a.estimated_duration || 15), 0);

    const shiftEnd = parseInt(doctor.shift_end.split(':')[0]);
    const now = new Date();
    const remainingShiftMins = Math.max(0, (shiftEnd - now.getHours()) * 60 - now.getMinutes());
    const remainingWorkMins = todayAppts
        .filter(a => ['scheduled', 'checked_in'].includes(a.status))
        .reduce((sum, a) => sum + (a.estimated_duration || 15), 0);

    const overtimePrediction = remainingWorkMins > remainingShiftMins
        ? remainingWorkMins - remainingShiftMins : 0;

    // Break suggestion
    const breakSuggestion = completed >= 5 && remaining > 3
        ? { suggested: true, after_patient: completed + 2, duration_mins: 15, reason: 'You\'ve seen 5+ patients. A short break improves focus.' }
        : { suggested: false };

    // Heatmap data (hourly patient count)
    const heatmap = [];
    for (let h = parseInt(doctor.shift_start.split(':')[0]); h < shiftEnd; h++) {
        const count = todayAppts.filter(a => {
            const aHour = new Date(a.scheduled_time).getHours();
            return aHour === h;
        }).length;
        heatmap.push({ hour: `${h}:00`, patients: count, intensity: Math.min(count / 4, 1) });
    }

    res.json({
        success: true,
        data: {
            doctor,
            today_stats: { total: todayAppts.length, completed, remaining },
            overtime_prediction: { minutes: overtimePrediction, likely: overtimePrediction > 0 },
            break_suggestion: breakSuggestion,
            heatmap
        }
    });
};

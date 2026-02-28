const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');
const Patient = require('../models/Patient');

exports.getAll = async (req, res) => {
    try {
        const doctors = await Doctor.find().sort({ name: 1 });
        res.json({ success: true, data: doctors.map(d => ({ ...d.toObject(), id: d._id })) });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getById = async (req, res) => {
    try {
        const doctor = await Doctor.findById(req.params.id);
        if (!doctor) return res.status(404).json({ success: false, error: 'Doctor not found' });
        res.json({ success: true, data: { ...doctor.toObject(), id: doctor._id } });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getSchedule = async (req, res) => {
    try {
        const doctorId = req.params.id;
        const date = req.query.date || new Date().toISOString().split('T')[0];

        // Build date range for the given date
        const startOfDay = new Date(date + 'T00:00:00.000Z');
        const endOfDay = new Date(date + 'T23:59:59.999Z');

        const appointments = await Appointment.find({
            doctor_id: doctorId,
            scheduled_time: { $gte: startOfDay, $lte: endOfDay }
        }).sort({ scheduled_time: 1 });

        // Populate patient names
        const populatedAppointments = await Promise.all(appointments.map(async (a) => {
            const patient = await Patient.findById(a.patient_id);
            return {
                ...a.toObject(), id: a._id,
                patient_name: patient ? patient.name : 'Unknown',
                patient_age: patient ? patient.age : null
            };
        }));

        const doctor = await Doctor.findById(doctorId);

        res.json({
            success: true,
            data: {
                doctor: { ...doctor.toObject(), id: doctor._id },
                date,
                appointments: populatedAppointments,
                total: populatedAppointments.length,
                completed: populatedAppointments.filter(a => a.status === 'completed').length,
                remaining: populatedAppointments.filter(a => ['scheduled', 'checked_in'].includes(a.status)).length
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getAvailableSlots = async (req, res) => {
    try {
        const doctorId = req.params.id;
        const date = req.query.date || new Date().toISOString().split('T')[0];
        const doctor = await Doctor.findById(doctorId);

        if (!doctor) return res.status(404).json({ success: false, error: 'Doctor not found' });

        // Get booked slots
        const startOfDay = new Date(date + 'T00:00:00.000Z');
        const endOfDay = new Date(date + 'T23:59:59.999Z');

        const booked = await Appointment.find({
            doctor_id: doctorId,
            scheduled_time: { $gte: startOfDay, $lte: endOfDay },
            status: { $ne: 'cancelled' }
        }).select('scheduled_time estimated_duration');

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
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.updateStatus = async (req, res) => {
    try {
        const { status } = req.body;
        await Doctor.findByIdAndUpdate(req.params.id, { status });
        const doctor = await Doctor.findById(req.params.id);
        res.json({ success: true, data: { ...doctor.toObject(), id: doctor._id } });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getWorkload = async (req, res) => {
    try {
        const doctorId = req.params.id;
        const doctor = await Doctor.findById(doctorId);

        // Today's stats
        const today = new Date().toISOString().split('T')[0];
        const startOfDay = new Date(today + 'T00:00:00.000Z');
        const endOfDay = new Date(today + 'T23:59:59.999Z');

        const todayAppts = await Appointment.find({
            doctor_id: doctorId,
            scheduled_time: { $gte: startOfDay, $lte: endOfDay }
        });

        const completed = todayAppts.filter(a => a.status === 'completed').length;
        const remaining = todayAppts.filter(a => ['scheduled', 'checked_in', 'in_progress'].includes(a.status)).length;

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
                doctor: { ...doctor.toObject(), id: doctor._id },
                today_stats: { total: todayAppts.length, completed, remaining },
                overtime_prediction: { minutes: overtimePrediction, likely: overtimePrediction > 0 },
                break_suggestion: breakSuggestion,
                heatmap
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

const QueueEntry = require('../models/QueueEntry');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');
const { generateId } = require('../utils/helpers');

async function getQueue(doctorId) {
    const filter = { status: { $in: ['waiting', 'in_consultation'] } };
    if (doctorId) filter.doctor_id = doctorId;

    const sortOrder = doctorId
        ? { position: 1 }
        : { doctor_id: 1, position: 1 };

    const entries = await QueueEntry.find(filter).sort(sortOrder);

    // Populate related data
    const populatedEntries = await Promise.all(entries.map(async (q) => {
        const patient = await Patient.findById(q.patient_id);
        const doctor = await Doctor.findById(q.doctor_id);
        const appointment = q.appointment_id ? await Appointment.findById(q.appointment_id) : null;

        return {
            ...q.toObject(),
            id: q._id,
            patient_name: patient ? patient.name : 'Unknown',
            patient_age: patient ? patient.age : null,
            patient_phone: patient ? patient.phone : null,
            doctor_name: doctor ? doctor.name : 'Unknown',
            doctor_specialty: doctor ? doctor.specialty : '',
            symptoms: appointment ? appointment.symptoms : '',
            urgency_level: appointment ? appointment.urgency_level : 'low',
            visit_type: appointment ? appointment.visit_type : 'routine',
            pain_level: appointment ? appointment.pain_level : 1,
            estimated_duration: appointment ? appointment.estimated_duration : 15,
            scheduled_time: appointment ? appointment.scheduled_time : null
        };
    }));

    return populatedEntries;
}

async function addToQueue({ appointmentId, patientId, doctorId, priority }) {
    const currentQueue = await getQueue(doctorId);
    const waitingQueue = currentQueue.filter(q => q.status === 'waiting');
    const waitingCount = waitingQueue.length;

    let position;
    if (priority === 'emergency') {
        // Insert at the front of the waiting queue
        position = 1;
        await QueueEntry.updateMany(
            { doctor_id: doctorId, status: 'waiting' },
            { $inc: { position: 1 } }
        );
    } else if (priority === 'high') {
        // Insert after existing emergencies and high priorities
        const highPriorityCount = waitingQueue.filter(q => q.priority === 'emergency' || q.priority === 'high').length;
        position = highPriorityCount + 1;
        await QueueEntry.updateMany(
            { doctor_id: doctorId, status: 'waiting', position: { $gte: position } },
            { $inc: { position: 1 } }
        );
    } else {
        position = waitingCount + 1;
    }

    // Calculate estimated wait
    const estimatedWait = await calculateWaitTime(doctorId, position);

    const id = generateId();
    await QueueEntry.create({
        _id: id,
        appointment_id: appointmentId,
        patient_id: patientId,
        doctor_id: doctorId,
        position,
        status: 'waiting',
        priority: priority || 'normal',
        estimated_wait_mins: estimatedWait
    });

    return { id, position, estimated_wait_mins: estimatedWait };
}

async function removeFromQueue(queueId) {
    const entry = await QueueEntry.findById(queueId);
    if (!entry) return null;

    await QueueEntry.findByIdAndUpdate(queueId, {
        status: 'completed',
        completed_at: new Date()
    });

    // Shift positions
    await QueueEntry.updateMany(
        { doctor_id: entry.doctor_id, position: { $gt: entry.position }, status: 'waiting' },
        { $inc: { position: -1 } }
    );

    await recalculateWaitTimes(entry.doctor_id);
    return entry;
}

async function moveToNext(doctorId) {
    // Complete current consultation
    const current = await QueueEntry.findOne({ doctor_id: doctorId, status: 'in_consultation' });
    if (current) {
        await QueueEntry.findByIdAndUpdate(current._id, {
            status: 'completed',
            completed_at: new Date()
        });
        await Appointment.findByIdAndUpdate(current.appointment_id, {
            status: 'completed',
            actual_end: new Date()
        });
    }

    // Call next patient
    const next = await QueueEntry.findOne({ doctor_id: doctorId, status: 'waiting' }).sort({ position: 1 });
    if (next) {
        await QueueEntry.findByIdAndUpdate(next._id, {
            status: 'in_consultation',
            called_at: new Date()
        });
        await Appointment.findByIdAndUpdate(next.appointment_id, {
            status: 'in_progress',
            actual_start: new Date()
        });
        // Shift positions
        await QueueEntry.updateMany(
            { doctor_id: doctorId, status: 'waiting' },
            { $inc: { position: -1 } }
        );
        await recalculateWaitTimes(doctorId);
        return next;
    }
    return null;
}

async function reorderQueue(doctorId, newOrder) {
    for (let i = 0; i < newOrder.length; i++) {
        await QueueEntry.findByIdAndUpdate(newOrder[i], { position: i + 1 });
    }
    await recalculateWaitTimes(doctorId);
}

function calculatePriorityScore(q) {
    let score = 0;

    // Emergency = +50
    if (q.visit_type === 'emergency' || q.priority === 'emergency') score += 50;

    // Pain level mapping
    const pain = q.pain_level || 1;
    score += pain * 10;

    // Age factor
    if (q.patient_age > 60) score += 10;

    // Waiting time factor (1 point per minute waiting)
    const checkedInAt = q.checked_in_at ? new Date(q.checked_in_at) : new Date();
    const waitMins = Math.max(0, Math.floor((new Date() - checkedInAt) / 60000));
    score += waitMins;

    return score;
}

async function rebalanceQueue(doctorId) {
    const queue = await getQueue(doctorId);
    const waiting = queue.filter(q => q.status === 'waiting');

    // Calculate priority scores for all waiting patients
    for (let q of waiting) {
        q.priority_score = calculatePriorityScore(q);
    }

    // Sort by priority_score descending (Max Heap simulation)
    // If scores identical, sort by original position (FIFO)
    waiting.sort((a, b) => {
        if (b.priority_score !== a.priority_score) {
            return b.priority_score - a.priority_score;
        }
        return a.position - b.position;
    });

    for (let i = 0; i < waiting.length; i++) {
        await QueueEntry.findByIdAndUpdate(waiting[i]._id || waiting[i].id, {
            position: i + 1,
            priority_score: waiting[i].priority_score
        });
    }

    await recalculateWaitTimes(doctorId);
    return await getQueue(doctorId);
}

async function calculateWaitTime(doctorId, position) {
    const doctor = await Doctor.findById(doctorId).select('avg_consultation_mins');
    const avgTime = doctor ? doctor.avg_consultation_mins : 15;

    // Current consultation remaining time (estimate half done)
    const inConsultation = await QueueEntry.findOne({ doctor_id: doctorId, status: 'in_consultation' });
    let waitMins = 0;
    if (inConsultation) {
        waitMins += Math.floor(avgTime / 2);
    }
    waitMins += (position - 1) * avgTime;
    return waitMins;
}

async function recalculateWaitTimes(doctorId) {
    const queue = await QueueEntry.find({ doctor_id: doctorId, status: 'waiting' }).sort({ position: 1 });
    const doctor = await Doctor.findById(doctorId).select('avg_consultation_mins');
    const avgTime = doctor ? doctor.avg_consultation_mins : 15;

    for (const entry of queue) {
        const wait = entry.position * avgTime;
        await QueueEntry.findByIdAndUpdate(entry._id, { estimated_wait_mins: wait });
    }
}

module.exports = { getQueue, addToQueue, removeFromQueue, moveToNext, reorderQueue, rebalanceQueue, calculateWaitTime };

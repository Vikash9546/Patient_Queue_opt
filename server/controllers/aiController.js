const aiService = require('../services/aiService');

exports.triage = async (req, res) => {
    const { symptoms, age, medical_history } = req.body;
    const result = await aiService.triagePatient({ symptoms, age, medicalHistory: medical_history });
    res.json({ success: true, data: result });
};

exports.estimateDuration = async (req, res) => {
    const { symptoms, age, medical_history, doctor_specialty, urgency } = req.body;
    const result = await aiService.estimateConsultationDuration({
        symptoms, age, medicalHistory: medical_history, doctorSpecialty: doctor_specialty, urgency
    });
    res.json({ success: true, data: result });
};

exports.predictNoShow = async (req, res) => {
    const { no_show_count, total_visits, day_of_week, time_of_day, age } = req.body;
    const result = await aiService.predictNoShow({
        noShowCount: no_show_count, totalVisits: total_visits,
        dayOfWeek: day_of_week, timeOfDay: time_of_day, age
    });
    res.json({ success: true, data: result });
};

exports.suggestSlots = async (req, res) => {
    const { available_slots, urgency, estimated_duration, queue_load } = req.body;
    const result = await aiService.suggestTimeSlots({
        availableSlots: available_slots, urgency, estimatedDuration: estimated_duration, queueLoad: queue_load
    });
    res.json({ success: true, data: result });
};

exports.chat = async (req, res) => {
    const { message, context } = req.body;
    const result = await aiService.chatbotResponse(message, context);
    res.json({ success: true, data: result });
};

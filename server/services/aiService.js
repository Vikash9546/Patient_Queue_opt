const { GoogleGenerativeAI } = require('@google/generative-ai');

let genAI = null;
let model = null;

function initAI() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== 'your_gemini_api_key_here' && apiKey.length > 0) {
        try {
            genAI = new GoogleGenerativeAI(apiKey);
            model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
            console.log('✅ Gemini AI initialized');
            return true;
        } catch (e) {
            console.log('⚠️ Gemini AI initialization failed, using fallback');
            return false;
        }
    }
    console.log('⚠️ No Gemini API key, using intelligent fallback');
    return false;
}

async function callAI(prompt) {
    if (!model) return null;
    try {
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        // Try to extract JSON from response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        return text;
    } catch (e) {
        console.error('AI call failed:', e.message);
        return null;
    }
}

// Fallback logic when AI is unavailable
function fallbackEstimateDuration(symptoms, age, urgency) {
    let base = 15;
    const lowerSymptoms = (symptoms || '').toLowerCase();

    if (lowerSymptoms.includes('chest pain') || lowerSymptoms.includes('breath')) base += 15;
    if (lowerSymptoms.includes('fever') && age < 12) base += 10;
    if (lowerSymptoms.includes('migraine') || lowerSymptoms.includes('severe')) base += 5;
    if (urgency === 'emergency') base += 20;
    else if (urgency === 'high') base += 10;
    else if (urgency === 'medium') base += 5;
    if (age > 60) base += 5;
    if (age < 5) base += 5;

    return Math.min(base, 60);
}

function fallbackTriage(symptoms, age) {
    const lowerSymptoms = (symptoms || '').toLowerCase();
    let score = 3;

    if (lowerSymptoms.includes('chest pain') || lowerSymptoms.includes('unconscious') ||
        lowerSymptoms.includes('severe bleeding') || lowerSymptoms.includes('stroke')) {
        return { urgency: 'emergency', triage_score: 10, reasoning: 'Critical symptoms detected' };
    }
    if (lowerSymptoms.includes('high fever') || lowerSymptoms.includes('breathing difficulty') ||
        lowerSymptoms.includes('fracture') || lowerSymptoms.includes('103')) {
        score = 7;
        if (age < 5 || age > 70) score = 8;
        return { urgency: 'high', triage_score: score, reasoning: 'Urgent symptoms requiring priority attention' };
    }
    if (lowerSymptoms.includes('fever') || lowerSymptoms.includes('pain') ||
        lowerSymptoms.includes('infection') || lowerSymptoms.includes('vomiting')) {
        score = 5;
        return { urgency: 'medium', triage_score: score, reasoning: 'Moderate symptoms, needs timely attention' };
    }

    return { urgency: 'low', triage_score: 3, reasoning: 'Non-urgent symptoms, routine consultation' };
}

function fallbackNoShowPrediction(noShowCount, totalVisits, dayOfWeek) {
    let prob = 0.1;
    if (totalVisits > 0) {
        prob = noShowCount / totalVisits;
    }
    // Higher no-show on Mondays and Fridays
    if (dayOfWeek === 1 || dayOfWeek === 5) prob += 0.05;
    // Afternoon appointments have higher no-show
    prob = Math.min(Math.max(prob, 0), 1);

    return {
        no_show_probability: Math.round(prob * 100) / 100,
        risk_level: prob > 0.3 ? 'high' : prob > 0.15 ? 'medium' : 'low',
        factors: ['Historical attendance', 'Day of week']
    };
}

async function estimateConsultationDuration({ symptoms, age, medicalHistory, doctorSpecialty, urgency }) {
    const prompt = `You are a medical scheduling AI. Based on the following patient data, estimate the consultation duration in minutes.

Patient Age: ${age}
Symptoms: ${symptoms}
Medical History: ${medicalHistory || 'None'}
Doctor Specialty: ${doctorSpecialty || 'General Medicine'}
Urgency Level: ${urgency || 'low'}

Respond with ONLY a JSON object: {"estimated_minutes": number, "confidence": number between 0 and 1, "reasoning": "brief explanation"}`;

    const result = await callAI(prompt);
    if (result && result.estimated_minutes) {
        return result;
    }

    const mins = fallbackEstimateDuration(symptoms, age, urgency);
    return { estimated_minutes: mins, confidence: 0.7, reasoning: 'Estimated based on symptom analysis rules' };
}

async function triagePatient({ symptoms, age, medicalHistory }) {
    const prompt = `You are an AI triage system. Classify the urgency of this patient visit.

Symptoms: ${symptoms}
Age: ${age}
Medical History: ${medicalHistory || 'None'}

Classify as: emergency, high, medium, or low
Respond with ONLY a JSON object: {"urgency": "level", "triage_score": number 1-10, "reasoning": "brief explanation"}`;

    const result = await callAI(prompt);
    if (result && result.urgency) {
        return result;
    }

    return fallbackTriage(symptoms, age);
}

async function predictNoShow({ noShowCount, totalVisits, dayOfWeek, timeOfDay, age }) {
    const prompt = `Predict the probability (0-1) that this patient will not show up for their appointment.

Previous No-Shows: ${noShowCount || 0}
Total Past Visits: ${totalVisits || 0}
Day of Week: ${dayOfWeek}
Time Slot: ${timeOfDay}
Patient Age: ${age}

Respond with ONLY a JSON object: {"no_show_probability": number, "risk_level": "low/medium/high", "factors": ["factor1", "factor2"]}`;

    const result = await callAI(prompt);
    if (result && result.no_show_probability !== undefined) {
        return result;
    }

    return fallbackNoShowPrediction(noShowCount, totalVisits, dayOfWeek);
}

async function suggestTimeSlots({ availableSlots, urgency, estimatedDuration, queueLoad }) {
    if (!availableSlots || availableSlots.length === 0) {
        return { recommended_slot: null, reasoning: 'No available slots', alternatives: [] };
    }

    const prompt = `Suggest the best appointment slot for this patient.

Available Slots: ${JSON.stringify(availableSlots)}
Patient Urgency: ${urgency}
Estimated Duration: ${estimatedDuration} minutes
Current Queue Load: ${queueLoad || 'moderate'}

Respond with ONLY a JSON object: {"recommended_slot": "time string", "reasoning": "brief explanation", "alternatives": ["slot1", "slot2"]}`;

    const result = await callAI(prompt);
    if (result && result.recommended_slot) {
        return result;
    }

    // Fallback: pick earliest for high urgency, spread out for low
    const sorted = [...availableSlots].sort();
    if (urgency === 'emergency' || urgency === 'high') {
        return { recommended_slot: sorted[0], reasoning: 'Earliest available slot due to urgency', alternatives: sorted.slice(1, 3) };
    }
    const mid = Math.floor(sorted.length / 2);
    return { recommended_slot: sorted[mid], reasoning: 'Balanced slot to distribute queue load', alternatives: [sorted[0], sorted[sorted.length - 1]] };
}

async function chatbotResponse(message, context) {
    const prompt = `You are MediQueue AI, a friendly and helpful clinic receptionist chatbot. Help patients with:
- Booking appointments
- Checking wait times
- General clinic queries
- Symptom-based guidance

Context: ${context || 'General query'}
Patient message: ${message}

Be concise, friendly, and professional. If symptoms sound serious, recommend visiting immediately.
Respond naturally in 2-3 sentences.`;

    const result = await callAI(prompt);
    if (typeof result === 'string') return { response: result };
    if (result && result.response) return result;

    // Fallback responses
    const lower = message.toLowerCase();
    if (lower.includes('book') || lower.includes('appointment')) {
        return { response: 'I can help you book an appointment! Please provide your name, age, and symptoms, and I\'ll find the best available slot for you. 📅' };
    }
    if (lower.includes('wait') || lower.includes('how long')) {
        return { response: 'Current average wait time is about 15-20 minutes. I can check the exact wait for a specific doctor if you tell me which one! ⏰' };
    }
    if (lower.includes('emergency')) {
        return { response: '🚨 If this is a medical emergency, please come to the clinic immediately. Emergency patients are prioritized and seen right away.' };
    }
    return { response: 'Welcome to MediQueue AI! I can help you book appointments, check wait times, or answer questions about our clinic. How can I help you today? 😊' };
}

module.exports = {
    initAI, estimateConsultationDuration, triagePatient,
    predictNoShow, suggestTimeSlots, chatbotResponse
};

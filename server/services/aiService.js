const http = require('http');

// ── ML Triage Server config ───────────────────────────────────────────────
const ML_HOST = process.env.ML_HOST || '127.0.0.1';
const ML_PORT = parseInt(process.env.ML_PORT || '5002');

/**
 * Calls the Decision Tree ML server for patient urgency prediction.
 * @param {object} payload  — { age, symptoms_text, pain_level, ... }
 * @returns {Promise<object|null>}  — { urgency, confidence, triage_score, reasoning } or null
 */
function callMLServer(payload) {
    return new Promise((resolve) => {
        const body = JSON.stringify(payload);
        const options = {
            hostname: ML_HOST,
            port: ML_PORT,
            path: '/predict',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body)
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                try { resolve(JSON.parse(data)); }
                catch (e) { resolve(null); }
            });
        });

        req.on('error', (e) => {
            console.warn(`⚠️  ML triage server unreachable (${e.message}), using fallback`);
            resolve(null);
        });

        req.setTimeout(3000, () => {
            req.destroy();
            console.warn('⚠️  ML triage server timeout, using fallback');
            resolve(null);
        });

        req.write(body);
        req.end();
    });
}

function initAI() {
    console.log('ℹ️  Triage powered by Decision Tree ML server (no Gemini required for triage).');
    return true;
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
    const mins = fallbackEstimateDuration(symptoms, age, urgency);
    return { estimated_minutes: mins, confidence: 0.7, reasoning: 'Estimated based on symptom analysis rules' };
}

async function triagePatient({ symptoms, age, medicalHistory, painLevel }) {
    // ── Try Decision Tree ML server first ────────────────────────────────
    const mlResult = await callMLServer({
        symptoms_text: `${symptoms || ''} ${medicalHistory || ''}`.trim(),
        age: age || 30,
        pain_level: painLevel || 3
    });

    if (mlResult && mlResult.urgency) {
        console.log(`🌳 ML Triage → urgency=${mlResult.urgency}, confidence=${mlResult.confidence}`);
        return {
            urgency: mlResult.urgency,
            triage_score: mlResult.triage_score,
            reasoning: mlResult.reasoning,
            confidence: mlResult.confidence,
            source: 'decision_tree_ml'
        };
    }

    // ── Fallback: keyword-based rules (ML server unavailable) ──────────
    console.log('🔁 Using keyword-based triage fallback');
    return fallbackTriage(symptoms, age);
}

async function predictNoShow({ noShowCount, totalVisits, dayOfWeek, timeOfDay, age }) {
    return fallbackNoShowPrediction(noShowCount, totalVisits, dayOfWeek);
}

async function suggestTimeSlots({ availableSlots, urgency, estimatedDuration, queueLoad }) {
    if (!availableSlots || availableSlots.length === 0) {
        return { recommended_slot: null, reasoning: 'No available slots', alternatives: [] };
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

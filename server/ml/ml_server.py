"""
ml_server.py — Flask REST API for Decision Tree triage inference.

Endpoints:
  GET  /health     → health check
  POST /predict    → { age, symptoms_text, pain_level?, heart_rate?,
                       systolic_bp?, respiratory_rate?, temperature? }
                   ← { urgency, confidence, triage_score, reasoning }
"""

import json
import re
import joblib
import numpy as np
from flask import Flask, request, jsonify

app = Flask(__name__)

# ── Load Model Artifacts ─────────────────────────────────────────────────────
try:
    clf = joblib.load('triage_model.pkl')
    le  = joblib.load('label_encoder.pkl')
    with open('feature_names.json') as f:
        FEATURE_COLS = json.load(f)
    print("✅ ML model loaded successfully")
    MODEL_READY = True
except Exception as e:
    print(f"❌ Failed to load model: {e}")
    MODEL_READY = False

# ── Symptom keyword → feature mapping ────────────────────────────────────────
SYMPTOM_MAP = {
    'chest_pain':           ['chest pain', 'chest ache', 'heart pain', 'cardiac', 'heart attack'],
    'difficulty_breathing': ['breathing', 'breath', 'dyspnea', 'shortness of breath', 'respiratory', 'choking', 'suffocating', 'asthma attack'],
    'unconscious':          ['unconscious', 'unresponsive', 'fainted', 'fainting', 'collapse', 'fell down'],
    'severe_bleeding':      ['bleeding', 'hemorrhage', 'blood loss', 'wound', 'laceration', 'cut deep'],
    'high_fever':           ['high fever', 'fever 103', 'fever 104', '103', '104', '105', 'burning up'],
    'fracture':             ['fracture', 'broken bone', 'broken arm', 'broken leg', 'dislocation', 'sprain'],
    'vomiting':             ['vomit', 'nausea', 'throwing up', 'puke', 'bile', 'sick stomach'],
    'infection':            ['infection', 'infected', 'pus', 'sepsis', 'wound infection', 'urinary tract', 'uti'],
    'headache':             ['headache', 'migraine', 'head pain', 'skull', 'head ache'],
    'routine':              ['routine', 'checkup', 'follow up', 'follow-up', 'prescription', 'vaccination', 'review'],
}

def extract_features(data: dict) -> np.ndarray:
    """Extract model feature vector from request payload."""
    age            = float(data.get('age', 30))
    pain_level     = float(data.get('pain_level', 3))
    heart_rate     = float(data.get('heart_rate', 80))
    systolic_bp    = float(data.get('systolic_bp', 120))
    resp_rate      = float(data.get('respiratory_rate', 16))
    temperature    = float(data.get('temperature', 37.0))

    symptoms_text  = (data.get('symptoms_text') or data.get('symptoms') or '').lower()

    # Extract binary symptom flags
    flags = {}
    for feat, keywords in SYMPTOM_MAP.items():
        flags[feat] = int(any(kw in symptoms_text for kw in keywords))

    # High fever heuristic from fever keyword (general)
    if 'fever' in symptoms_text and 'high' not in symptoms_text:
        # Generic "fever" → medium indicator; don't override if already set
        pass

    vector = [
        age, pain_level, heart_rate, systolic_bp, resp_rate, temperature,
        flags['chest_pain'], flags['difficulty_breathing'],
        flags['unconscious'], flags['severe_bleeding'],
        flags['high_fever'], flags['fracture'],
        flags['vomiting'], flags['infection'],
        flags['headache'], flags['routine'],
    ]
    return np.array(vector).reshape(1, -1), flags

def urgency_to_score(urgency: str) -> int:
    return {'emergency': 10, 'high': 7, 'medium': 5, 'low': 2}.get(urgency, 3)

def build_reasoning(urgency: str, flags: dict, pain_level: float, age: float, temperature: float) -> str:
    reasons = []
    if flags.get('chest_pain'):        reasons.append('chest pain detected')
    if flags.get('unconscious'):       reasons.append('patient is unconscious')
    if flags.get('severe_bleeding'):   reasons.append('severe bleeding reported')
    if flags.get('difficulty_breathing'): reasons.append('breathing difficulty reported')
    if flags.get('high_fever'):        reasons.append('high fever (>103°F)')
    if flags.get('fracture'):          reasons.append('possible fracture/dislocation')
    if flags.get('vomiting'):          reasons.append('vomiting/nausea present')
    if flags.get('infection'):         reasons.append('infection suspected')
    if pain_level >= 7:                reasons.append(f'high pain level ({int(pain_level)}/10)')
    if temperature >= 39.0:            reasons.append(f'elevated temperature ({temperature}°C)')
    if age < 5 or age > 70:            reasons.append('age-related risk factor')
    if flags.get('routine'):           reasons.append('routine / follow-up visit')

    if not reasons:
        reasons.append('general assessment based on vitals and symptoms')

    level_text = {
        'emergency': 'Emergency — immediate intervention required.',
        'high':      'High priority — urgent attention needed.',
        'medium':    'Medium priority — timely care recommended.',
        'low':       'Low priority — routine consultation.',
    }.get(urgency, 'Assessment complete.')

    return f"{level_text} Factors: {', '.join(reasons)}."


# ── Routes ────────────────────────────────────────────────────────────────────

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'model_ready': MODEL_READY})


@app.route('/predict', methods=['POST'])
def predict():
    if not MODEL_READY:
        return jsonify({'error': 'Model not loaded. Run train_model.py first.'}), 503

    data = request.get_json(silent=True) or {}
    try:
        features, flags = extract_features(data)

        # Predict class probabilities
        proba = clf.predict_proba(features)[0]
        class_idx = int(np.argmax(proba))
        confidence = float(np.max(proba))
        urgency = le.inverse_transform([class_idx])[0]

        triage_score = urgency_to_score(urgency)
        reasoning = build_reasoning(
            urgency, flags,
            float(data.get('pain_level', 3)),
            float(data.get('age', 30)),
            float(data.get('temperature', 37.0))
        )

        return jsonify({
            'urgency':      urgency,
            'confidence':   round(confidence, 4),
            'triage_score': triage_score,
            'reasoning':    reasoning,
            'all_proba': {
                le.inverse_transform([i])[0]: round(float(p), 4)
                for i, p in enumerate(proba)
            }
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    print("🚀 ML Triage Server starting on http://127.0.0.1:5002")
    app.run(host='0.0.0.0', port=5002, debug=False)

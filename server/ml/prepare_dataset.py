"""
prepare_dataset.py — Generate a synthetic medical triage dataset.

Rules are based on standard Emergency Severity Index (ESI) guidelines:
  emergency : chest pain + high HR/BP, unconscious, severe bleeding, stroke, O2 desat
  high      : high fever (>103°F), breathing difficulty, fractures, pain_level >= 7, age extremes with bad vitals
  medium    : fever, vomiting, infection, moderate pain (4-6), uri
  low       : routine checkup, mild cold, mild headache, follow-up
"""

import numpy as np
import pandas as pd
import random

np.random.seed(42)
random.seed(42)

N = 2000  # total records


def clamp(val, lo, hi):
    return max(lo, min(hi, val))


records = []

# ---------- Emergency cases (~18%) ----------
for _ in range(int(N * 0.18)):
    age = random.randint(18, 85)
    scenario = random.choice([
        'chest_pain', 'unconscious', 'severe_bleeding', 'stroke', 'respiratory_arrest'
    ])
    pain_level = clamp(int(np.random.normal(9, 0.5)), 8, 10)
    heart_rate = clamp(int(np.random.normal(130, 15)), 110, 180)
    systolic_bp = clamp(int(np.random.normal(160, 20)), 90, 220)
    resp_rate = clamp(int(np.random.normal(26, 3)), 20, 40)
    temperature = round(np.random.normal(38.5, 0.5), 1)

    records.append({
        'age': age,
        'pain_level': pain_level,
        'heart_rate': heart_rate,
        'systolic_bp': systolic_bp,
        'respiratory_rate': resp_rate,
        'temperature': temperature,
        'chest_pain':          1 if scenario in ('chest_pain', 'stroke') else 0,
        'difficulty_breathing': 1 if scenario in ('respiratory_arrest', 'chest_pain') else 0,
        'unconscious':         1 if scenario == 'unconscious' else 0,
        'severe_bleeding':     1 if scenario == 'severe_bleeding' else 0,
        'high_fever':          0,
        'fracture':            0,
        'vomiting':            0,
        'infection':           0,
        'headache':            1 if scenario == 'stroke' else 0,
        'routine':             0,
        'urgency': 'emergency'
    })

# ---------- High urgency cases (~25%) ----------
for _ in range(int(N * 0.25)):
    age = random.randint(1, 90)
    scenario = random.choice([
        'high_fever', 'breathing_difficulty', 'fracture', 'severe_pain'
    ])
    pain_level = clamp(int(np.random.normal(7.5, 0.8)), 6, 10)
    heart_rate = clamp(int(np.random.normal(110, 12)), 90, 150)
    systolic_bp = clamp(int(np.random.normal(140, 15)), 100, 180)
    resp_rate = clamp(int(np.random.normal(22, 3)), 18, 35)
    temperature = round(np.random.normal(39.5, 0.4), 1) if scenario == 'high_fever' else round(np.random.normal(37.5, 0.3), 1)

    records.append({
        'age': age,
        'pain_level': pain_level,
        'heart_rate': heart_rate,
        'systolic_bp': systolic_bp,
        'respiratory_rate': resp_rate,
        'temperature': temperature,
        'chest_pain':          0,
        'difficulty_breathing': 1 if scenario == 'breathing_difficulty' else 0,
        'unconscious':         0,
        'severe_bleeding':     0,
        'high_fever':          1 if scenario == 'high_fever' else 0,
        'fracture':            1 if scenario == 'fracture' else 0,
        'vomiting':            random.randint(0, 1),
        'infection':           0,
        'headache':            0,
        'routine':             0,
        'urgency': 'high'
    })

# ---------- Medium urgency cases (~32%) ----------
for _ in range(int(N * 0.32)):
    age = random.randint(5, 80)
    scenario = random.choice([
        'fever', 'vomiting', 'infection', 'moderate_pain', 'uti'
    ])
    pain_level = clamp(int(np.random.normal(5, 1)), 3, 7)
    heart_rate = clamp(int(np.random.normal(92, 10)), 70, 120)
    systolic_bp = clamp(int(np.random.normal(125, 12)), 100, 160)
    resp_rate = clamp(int(np.random.normal(18, 2)), 14, 24)
    temperature = round(np.random.normal(38.2, 0.5), 1) if scenario == 'fever' else round(np.random.normal(37.2, 0.3), 1)

    records.append({
        'age': age,
        'pain_level': pain_level,
        'heart_rate': heart_rate,
        'systolic_bp': systolic_bp,
        'respiratory_rate': resp_rate,
        'temperature': temperature,
        'chest_pain':          0,
        'difficulty_breathing': 0,
        'unconscious':         0,
        'severe_bleeding':     0,
        'high_fever':          0,
        'fracture':            0,
        'vomiting':            1 if scenario == 'vomiting' else 0,
        'infection':           1 if scenario == 'infection' else 0,
        'headache':            random.randint(0, 1),
        'routine':             0,
        'urgency': 'medium'
    })

# ---------- Low urgency cases (~25%) ----------
for _ in range(int(N * 0.25)):
    age = random.randint(10, 75)
    scenario = random.choice([
        'routine', 'cold', 'mild_headache', 'follow_up', 'mild_cough'
    ])
    pain_level = clamp(int(np.random.normal(2, 1)), 0, 4)
    heart_rate = clamp(int(np.random.normal(78, 8)), 60, 100)
    systolic_bp = clamp(int(np.random.normal(118, 10)), 100, 140)
    resp_rate = clamp(int(np.random.normal(16, 1)), 12, 20)
    temperature = round(np.random.normal(37.0, 0.3), 1)

    records.append({
        'age': age,
        'pain_level': pain_level,
        'heart_rate': heart_rate,
        'systolic_bp': systolic_bp,
        'respiratory_rate': resp_rate,
        'temperature': temperature,
        'chest_pain':          0,
        'difficulty_breathing': 0,
        'unconscious':         0,
        'severe_bleeding':     0,
        'high_fever':          0,
        'fracture':            0,
        'vomiting':            0,
        'infection':           random.randint(0, 1),
        'headache':            1 if scenario == 'mild_headache' else 0,
        'routine':             1 if scenario in ('routine', 'follow_up') else 0,
        'urgency': 'low'
    })

df = pd.DataFrame(records)
df = df.sample(frac=1, random_state=42).reset_index(drop=True)

output_path = 'triage_dataset.csv'
df.to_csv(output_path, index=False)

print(f"✅ Dataset created: {output_path}")
print(f"   Total records : {len(df)}")
print(f"   Urgency distribution:")
print(df['urgency'].value_counts())

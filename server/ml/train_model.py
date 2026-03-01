"""
train_model.py — Train a Decision Tree classifier for patient urgency triage.

Features:
  age, pain_level, heart_rate, systolic_bp, respiratory_rate, temperature,
  chest_pain, difficulty_breathing, unconscious, severe_bleeding,
  high_fever, fracture, vomiting, infection, headache, routine

Target: urgency (emergency | high | medium | low)
"""

import pandas as pd
import numpy as np
import json
import joblib
import os
from sklearn.tree import DecisionTreeClassifier, export_text
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import classification_report, accuracy_score, confusion_matrix

# ── Load Dataset ────────────────────────────────────────────────────────────
df = pd.read_csv('triage_dataset.csv')
print(f"Dataset loaded: {len(df)} rows, {df['urgency'].nunique()} classes")
print("Class distribution:\n", df['urgency'].value_counts())

FEATURE_COLS = [
    'age', 'pain_level', 'heart_rate', 'systolic_bp',
    'respiratory_rate', 'temperature',
    'chest_pain', 'difficulty_breathing', 'unconscious', 'severe_bleeding',
    'high_fever', 'fracture', 'vomiting', 'infection', 'headache', 'routine'
]

X = df[FEATURE_COLS].values
le = LabelEncoder()
y = le.fit_transform(df['urgency'])

print("\nLabel encoding:")
for i, cls in enumerate(le.classes_):
    print(f"  {i} → {cls}")

# ── Train / Test Split ───────────────────────────────────────────────────────
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, stratify=y, random_state=42
)

# ── Decision Tree Classifier ─────────────────────────────────────────────────
# max_depth=12 gives good accuracy without too much overfitting
# min_samples_leaf=5 prevents the tree from being too granular on noisy samples
clf = DecisionTreeClassifier(
    max_depth=12,
    min_samples_leaf=5,
    criterion='gini',
    class_weight='balanced',
    random_state=42
)

clf.fit(X_train, y_train)

# ── Cross-Validation ─────────────────────────────────────────────────────────
cv_scores = cross_val_score(clf, X, y, cv=5, scoring='accuracy')
print(f"\n5-Fold CV Accuracy: {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")

# ── Test Set Evaluation ──────────────────────────────────────────────────────
y_pred = clf.predict(X_test)
acc = accuracy_score(y_test, y_pred)
print(f"\nTest Accuracy: {acc:.4f}")

print("\nClassification Report:")
print(classification_report(y_test, y_pred, target_names=le.classes_))

print("Confusion Matrix (rows=actual, cols=predicted):")
print(confusion_matrix(y_test, y_pred))

# ── Feature Importance ────────────────────────────────────────────────────────
importances = clf.feature_importances_
print("\nFeature Importances:")
for feat, imp in sorted(zip(FEATURE_COLS, importances), key=lambda x: -x[1]):
    bar = '█' * int(imp * 40)
    print(f"  {feat:<25} {bar} {imp:.4f}")

# ── Save Artifacts ───────────────────────────────────────────────────────────
joblib.dump(clf, 'triage_model.pkl')
joblib.dump(le,  'label_encoder.pkl')

with open('feature_names.json', 'w') as f:
    json.dump(FEATURE_COLS, f, indent=2)

print("\n✅ Model artifacts saved:")
print("   triage_model.pkl")
print("   label_encoder.pkl")
print("   feature_names.json")

# Optional: print tree structure (first 4 levels)
print("\nDecision Tree Structure (depth 0-4):")
print(export_text(clf, feature_names=FEATURE_COLS, max_depth=4))

import os
import joblib


# ==========================================
# MODEL PATH
# ==========================================

MODEL_PATH = os.path.join(
    os.path.dirname(__file__),
    "complaint_classifier.pkl"
)


# ==========================================
# LOAD MODEL
# ==========================================

try:
    model = joblib.load(MODEL_PATH)
    print("ML complaint classifier loaded successfully.")

except Exception as e:
    model = None
    print(f"ML model could not be loaded: {e}")


# ==========================================
# PREDICT COMPLAINT CATEGORY
# ==========================================

def predict_complaint(title: str, description: str):

    if model is None:
        return {
            "category": "Other",
            "confidence": 0.0
        }

    # Combine title + description
    complaint_text = f"{title}. {description}"

    # Predict category
    prediction = model.predict([complaint_text])[0]

    # Get probability/confidence
    probabilities = model.predict_proba([complaint_text])[0]

    confidence = float(max(probabilities))

    return {
        "category": prediction,
        "confidence": confidence
    }
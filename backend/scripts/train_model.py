import pandas as pd
import joblib

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report


# ==========================================
# LOAD TRAINING DATA
# ==========================================

data = pd.read_csv("training_data.csv")

X = data["text"]
y = data["category"]


# ==========================================
# SPLIT DATA
# ==========================================

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.3,
    random_state=42,
    stratify=y
)


# ==========================================
# CREATE ML PIPELINE
# ==========================================

model = Pipeline([
    (
        "tfidf",
        TfidfVectorizer(
            lowercase=True,
            ngram_range=(1, 2),
            max_features=3000
        )
    ),
    (
        "classifier",
        LogisticRegression(
            max_iter=1000
        )
    )
])


# ==========================================
# TRAIN MODEL
# ==========================================

print("\nTraining ML model...")

model.fit(X_train, y_train)


# ==========================================
# TEST MODEL
# ==========================================

predictions = model.predict(X_test)

accuracy = accuracy_score(y_test, predictions)

print("\n========================================")
print("ML MODEL TRAINING COMPLETE")
print("========================================")
print(f"Accuracy: {accuracy:.2%}")

print("\nClassification Report:")
print(classification_report(
    y_test,
    predictions,
    zero_division=0
))


# ==========================================
# SAVE MODEL
# ==========================================

joblib.dump(
    model,
    "complaint_classifier.pkl"
)

print("\nModel saved as:")
print("complaint_classifier.pkl")


# ==========================================
# TEST WITH SAMPLE COMPLAINTS
# ==========================================

test_complaints = [
    "There is a huge pothole near the school",
    "Our area has no drinking water",
    "Garbage has not been collected for a week",
    "The street light is broken",
    "The drainage is overflowing"
]

print("\nSample Predictions:")
print("----------------------------------------")

for complaint in test_complaints:

    prediction = model.predict([complaint])[0]

    probabilities = model.predict_proba([complaint])[0]

    confidence = max(probabilities)

    print(f"\nComplaint: {complaint}")
    print(f"Predicted Category: {prediction}")
    print(f"Confidence: {confidence:.2%}")
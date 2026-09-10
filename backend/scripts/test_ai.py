from app.services.ai_service import analyze_complaint

result = analyze_complaint(
    "Large pothole near college",
    "There is a very large pothole near the college entrance. "
    "Vehicles are having difficulty passing and it may cause accidents."
)

print(result)

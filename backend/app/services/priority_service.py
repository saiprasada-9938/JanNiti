from sqlalchemy.orm import Session
from app.models.submission import Submission

def normalize_category(category):
    """
    Normalizes similar category names into one civic theme.
    """

    if not category:
        return "Other"

    category = category.strip().lower()

    category_mapping = {
        "road": "Road",
        "roads": "Road",
        "road infrastructure": "Road",
        "road repair": "Road",

        "transport": "Transport",
        "transportation": "Transport",

        "water": "Water",
        "water supply": "Water",

        "streetlight": "Streetlight",
        "street light": "Streetlight",
        "street lights": "Streetlight",

        "sanitation": "Sanitation",
        "waste": "Sanitation",
        "garbage": "Sanitation"
    }

    return category_mapping.get(
        category,
        category.title()
    )


def calculate_priority_scores(db: Session):
    """
    Calculates transparent priority scores for complaint categories.

    Scoring:
    - Citizen Demand / Recurrence: 30 points
    - Severity Proxy: 25 points
    - Hotspot Concentration: 20 points
    - ML Confidence: 10 points
    - Pending / Active Demand: 15 points

    Total: 100 points
    """

    submissions = db.query(Submission).all()

    if not submissions:
        return []

    # Group submissions by category
    category_groups = {}

    for submission in submissions:

        # Prefer ML category, then AI category, then citizen category
        raw_category = (
           submission.ml_category
           or submission.ai_category
           or submission.category
           or "Other"
     )

        category = normalize_category(raw_category)

        if category not in category_groups:
            category_groups[category] = []

        category_groups[category].append(submission)

    total_submissions = len(submissions)
    results = []

    for category, complaints in category_groups.items():

        complaint_count = len(complaints)

        # =====================================
        # 1. CITIZEN DEMAND SCORE — 30 points
        # =====================================

        demand_ratio = complaint_count / total_submissions
        demand_score = round(demand_ratio * 30, 2)

        # =====================================
        # 2. SEVERITY PROXY — 25 points
        # Based on words in title/description
        # =====================================

        severe_words = [
              "accident",
              "accidents",
              "danger",
              "dangerous",
              "severe",
              "emergency",
              "urgent",
              "flood",
              "collapsed",
              "collapse",
              "broken",
              "critical",
              "pothole",
              "potholes",
              "damaged",
              "damage",
              "unsafe",
              "risk"
        ]

        severity_hits = 0

        for complaint in complaints:
            text = (
                f"{complaint.title} "
                f"{complaint.description}"
            ).lower()

            if any(word in text for word in severe_words):
                severity_hits += 1

        severity_ratio = severity_hits / complaint_count

        severity_score = round(
            severity_ratio * 25,
            2
        )

        # =====================================
        # 3. HOTSPOT SCORE — 20 points
        # Same ward = higher geographic demand
        # =====================================

        ward_counts = {}

        for complaint in complaints:
            ward = complaint.ward or "Unknown"

            ward_counts[ward] = (
                ward_counts.get(ward, 0) + 1
            )

        largest_ward_cluster = max(
            ward_counts.values()
        )

        # A hotspot should require multiple complaints
        if largest_ward_cluster >= 5:
           hotspot_score = 20
        elif largest_ward_cluster >= 3:
           hotspot_score = 15
        elif largest_ward_cluster >= 2:
           hotspot_score = 8
        else:
           hotspot_score = 0

        # =====================================
        # 4. ML CONFIDENCE — 10 points
        # =====================================

        confidences = [
            complaint.ml_confidence
            for complaint in complaints
            if complaint.ml_confidence is not None
        ]

        if confidences:
            average_confidence = (
                sum(confidences) / len(confidences)
            )
        else:
            average_confidence = 0

        ml_confidence_score = round(
            average_confidence * 10,
            2
        )

        # =====================================
        # 5. ACTIVE / PENDING DEMAND — 15 points
        # =====================================

        unresolved_statuses = [
            "Submitted",
            "Under Review",
            "Action Planned"
        ]

        active_complaints = sum(
            1
            for complaint in complaints
            if complaint.status in unresolved_statuses
        )

        active_ratio = (
            active_complaints / complaint_count
        )

        active_score = round(
            active_ratio * 15,
            2
        )

        # =====================================
        # FINAL SCORE
        # =====================================

        final_score = round(
            demand_score
            + severity_score
            + hotspot_score
            + ml_confidence_score
            + active_score,
            2
        )

        results.append({
            "category": category,
            "total_complaints": complaint_count,

            "priority_breakdown": {
                "citizen_demand": demand_score,
                "severity": severity_score,
                "hotspot_concentration": hotspot_score,
                "ml_confidence": ml_confidence_score,
                "active_demand": active_score
            },

            "final_priority_score": final_score,

            "explanation": (
                f"{complaint_count} citizen submissions "
                f"were grouped under {category}. "
                f"The score considers recurring demand, "
                f"severity indicators, geographic concentration, "
                f"ML classification confidence, and unresolved demand."
            )
        })

    # Highest priority first
    results.sort(
        key=lambda item: item["final_priority_score"],
        reverse=True
    )

    # Add rank
    for index, item in enumerate(results, start=1):
        item["rank"] = index

    return results
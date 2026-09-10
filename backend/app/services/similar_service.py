from sqlalchemy.orm import Session
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from app.models.submission import Submission


def find_similar_complaints(
    db: Session,
    title: str,
    description: str,
    category: str | None = None,
    limit: int = 3,
):
    """Find previously submitted complaints that are textually similar."""
    complaints = db.query(Submission).order_by(Submission.id.desc()).all()

    if not complaints:
        return []

    query_text = f"{title} {description}".strip()
    documents = [f"{c.title} {c.description}".strip() for c in complaints]

    try:
        vectorizer = TfidfVectorizer(stop_words="english", ngram_range=(1, 2))
        matrix = vectorizer.fit_transform(documents + [query_text])
        scores = cosine_similarity(matrix[-1], matrix[:-1]).flatten()
    except ValueError:
        return []

    results = []
    for complaint, score in zip(complaints, scores):
        category_bonus = 0.08 if category and complaint.category.lower() == category.lower() else 0.0
        final_score = min(float(score) + category_bonus, 1.0)

        if final_score < 0.25:
            continue

        results.append({
            "id": complaint.id,
            "complaint_id": f"CMP-{complaint.id}",
            "title": complaint.title,
            "description": complaint.description,
            "category": complaint.category,
            "village": complaint.village,
            "district": complaint.district,
            "status": complaint.status,
            "similarity": round(final_score * 100, 1),
        })

    results.sort(key=lambda item: item["similarity"], reverse=True)
    return results[:limit]

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session
import json


from app.database.database import SessionLocal
from app.models.submission import Submission
from app.schemas.submission import (
    SubmissionCreate,
    SubmissionStatusUpdate,
    SimilarComplaintRequest
)
from app.services.ai_service import analyze_complaint
from app.ml.ml_service import predict_complaint
from app.services.priority_service import calculate_priority_scores
from app.services.similar_service import find_similar_complaints
from app.services.photo_service import analyze_photo, save_photo
from app.auth.dependencies import get_current_admin
import os

router = APIRouter(
    prefix="/api/submissions",
    tags=["Submissions"]
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _parse_ai_result(result: str) -> dict:
    try:
        return json.loads(result)
    except json.JSONDecodeError:
        return {"summary": "", "category": "", "department": "", "keywords": []}


def run_ai_analysis(submission_id: int) -> None:
    """Enhance a saved complaint without making the citizen wait for Gemini."""
    db = SessionLocal()
    try:
        submission = db.query(Submission).filter(Submission.id == submission_id).first()
        if not submission:
            return

        submission.ai_status = "Processing"
        db.commit()
        completed_steps = 0

        try:
            ai_data = _parse_ai_result(analyze_complaint(submission.title, submission.description))
            keywords = ai_data.get("keywords", [])
            submission.ai_category = ai_data.get("category")
            submission.ai_summary = ai_data.get("summary")
            submission.ai_department = ai_data.get("department")
            submission.ai_keywords = ", ".join(keywords) if isinstance(keywords, list) else str(keywords or "")
            completed_steps += 1
        except Exception as error:
            print(f"Text AI analysis unavailable for submission {submission_id}: {error}")

        if submission.photo_filename:
            try:
                upload_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "uploads"))
                photo_path = os.path.join(upload_dir, os.path.basename(submission.photo_filename))
                with open(photo_path, "rb") as photo_file:
                    submission.photo_analysis = json.dumps(analyze_photo(photo_file.read(), "image/jpeg"))
                completed_steps += 1
            except Exception as error:
                print(f"Photo AI analysis unavailable for submission {submission_id}: {error}")

        submission.ai_status = "Complete" if completed_steps else "Unavailable"
        db.commit()
    finally:
        db.close()


# =========================
# AI PHOTO ANALYSIS
# =========================

@router.post("/upload-photo")
async def upload_complaint_photo(file: UploadFile = File(...)):
    """Save evidence quickly; Gemini will inspect it after complaint submission."""
    allowed_types = {"image/jpeg", "image/png", "image/webp"}
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Please upload a JPG, PNG, or WebP image.")

    image_bytes = await file.read()
    if len(image_bytes) > 8 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image must be 8 MB or smaller.")

    upload_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "uploads"))
    filename = save_photo(image_bytes, file.filename or "complaint.jpg", upload_dir)

    return {
        "message": "Photo uploaded successfully",
        "data": {
            "photo_filename": filename
        }
    }


@router.post("/analyze-photo")
async def analyze_complaint_photo(file: UploadFile = File(...)):
    """Legacy endpoint retained for compatibility with older frontends."""
    allowed_types = {"image/jpeg", "image/png", "image/webp"}
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Please upload a JPG, PNG, or WebP image.")
    image_bytes = await file.read()
    if len(image_bytes) > 8 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image must be 8 MB or smaller.")
    upload_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "uploads"))
    filename = save_photo(image_bytes, file.filename or "complaint.jpg", upload_dir)
    return {"message": "Photo analyzed successfully", "data": {"photo_filename": filename, "analysis": analyze_photo(image_bytes, file.content_type)}}


# =========================
# SIMILAR COMPLAINT DETECTION
# =========================

@router.post("/similar")
def similar_complaints(
    request: SimilarComplaintRequest,
    db: Session = Depends(get_db)
):
    matches = find_similar_complaints(
        db, request.title, request.description, request.category, request.limit
    )
    return {
        "message": "Similar complaint analysis completed",
        "count": len(matches),
        "data": matches
    }


# =========================
# CREATE SUBMISSION
# =========================

@router.post("/")
def create_submission(
    submission: SubmissionCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    print("CREATE_SUBMISSION CALLED")
    # =========================
    # ML ANALYSIS
    # =========================

    ml_result = predict_complaint(
    submission.title,
    submission.description
)

    ml_category = ml_result.get("category")
    ml_confidence = ml_result.get("confidence")

    # =========================
    # CREATE DATABASE RECORD
    # =========================

    new_submission = Submission(
        title=submission.title,
        description=submission.description,
        category=submission.category,
        severity=submission.severity,

        # AI ANALYSIS (filled by the background task)
        ai_status="Pending",

        # ML ANALYSIS
        ml_category=ml_category,
        ml_confidence=ml_confidence,

        # PHOTO EVIDENCE
        photo_filename=submission.photo_filename,
        photo_analysis=submission.photo_analysis,

        # CITIZEN DETAILS
        name=submission.name,
        phone=submission.phone,
        village=submission.village,
        district=submission.district,
        language=submission.language,

        # WARD
        ward=submission.ward,

        # REAL GPS LOCATION
        latitude=submission.latitude,
        longitude=submission.longitude
    )

    db.add(new_submission)
    db.commit()
    db.refresh(new_submission)
    background_tasks.add_task(run_ai_analysis, new_submission.id)

    return {
        "message": "CivicAI received the submission successfully!",
        "data": {
            "id": new_submission.id,
            "complaint_id": f"CMP-{new_submission.id}",

            "title": new_submission.title,
            "description": new_submission.description,
            "category": new_submission.category,
            "severity": new_submission.severity,
            "ai_status": new_submission.ai_status,

            # ML ANALYSIS
            "ml_category": new_submission.ml_category,
            "ml_confidence": new_submission.ml_confidence,
            "photo_filename": new_submission.photo_filename,
            "photo_analysis": new_submission.photo_analysis,

            # AI ANALYSIS
            "ai_category": new_submission.ai_category,
            "ai_summary": new_submission.ai_summary,
            "ai_department": new_submission.ai_department,
            "ai_keywords": new_submission.ai_keywords,

            "name": new_submission.name,
            "phone": new_submission.phone,
            "village": new_submission.village,
            "district": new_submission.district,
            "language": new_submission.language,
            "ward": new_submission.ward,

            "latitude": new_submission.latitude,
            "longitude": new_submission.longitude,

            "status": new_submission.status,
            "created_at": new_submission.created_at
        }
    }# =========================
# GET ALL SUBMISSIONS
# =========================

@router.get("/")
def get_submissions(
    db: Session = Depends(get_db),
    admin: str = Depends(get_current_admin),
):
    submissions = db.query(Submission).all()

    return {
        "data": [
            {
                "id": submission.id,
                "title": submission.title,
                "description": submission.description,
                "category": submission.category,
                "severity": submission.severity,
                "ai_status": submission.ai_status,

                # ML ANALYSIS
                "ml_category": submission.ml_category,
                "ml_confidence": submission.ml_confidence,
                "photo_filename": submission.photo_filename,
                "photo_analysis": submission.photo_analysis,

                # AI ANALYSIS
                "ai_category": submission.ai_category,
                "ai_summary": submission.ai_summary,
                "ai_department": submission.ai_department,
                "ai_keywords": submission.ai_keywords,
                "name": submission.name,
                "phone": submission.phone,
                "village": submission.village,
                "district": submission.district,
                "language": submission.language,
                "ward": submission.ward,
                "latitude": submission.latitude,
                "longitude": submission.longitude,
                "status": submission.status,
                "created_at": submission.created_at
            }
            for submission in submissions
        ]
    }
# =========================
# GET PRIORITY RANKINGS
# =========================

@router.get("/priorities")
def get_priority_rankings(
    db: Session = Depends(get_db),
    admin: str = Depends(get_current_admin),
):
    priorities = calculate_priority_scores(db)

    return {
        "total_categories": len(priorities),
        "data": priorities
    }

# =========================
# GET SUBMISSION BY ID
# =========================

@router.get("/{submission_id}")
def get_submission(
    submission_id: str,
    db: Session = Depends(get_db)
):
    # Convert CMP-5 → 5
    if submission_id.upper().startswith("CMP-"):
        submission_id = submission_id[4:]

    try:
        submission_id = int(submission_id)
    except ValueError:
        return {
            "message": "Invalid submission ID"
        }

    submission = db.query(Submission).filter(
        Submission.id == submission_id
    ).first()

    if not submission:
        return {
            "message": "Submission not found"
        }

    return {
        "data": {
            "id": submission.id,
            "complaint_id": f"CMP-{submission.id}",
            "title": submission.title,
            "description": submission.description,
            "category": submission.category,
            "severity": submission.severity,
            "ai_status": submission.ai_status,

            # ML ANALYSIS
            "ml_category": submission.ml_category,
            "ml_confidence": submission.ml_confidence,
            "photo_filename": submission.photo_filename,
            "photo_analysis": submission.photo_analysis,
            
            "ai_category": submission.ai_category,
            "ai_summary": submission.ai_summary,
            "ai_department": submission.ai_department,
            "ai_keywords": submission.ai_keywords,
            "name": submission.name,
            "phone": submission.phone,
            "village": submission.village,
            "district": submission.district,
            "language": submission.language,
            "ward": submission.ward,
            "latitude": submission.latitude,
            "longitude": submission.longitude,
            "status": submission.status,
            "created_at": submission.created_at
        }
    }

# =========================
# UPDATE SUBMISSION STATUS
# =========================

@router.patch("/{submission_id}/status")
def update_submission_status(
    submission_id: str,
    status_data: SubmissionStatusUpdate,
    db: Session = Depends(get_db),
    admin: str = Depends(get_current_admin),
):
    # Convert CMP-5 → 5
    if submission_id.upper().startswith("CMP-"):
        submission_id = submission_id[4:]

    try:
        submission_id = int(submission_id)
    except ValueError:
        return {
            "message": "Invalid submission ID"
        }

    submission = db.query(Submission).filter(
        Submission.id == submission_id
    ).first()

    if not submission:
        return {
            "message": "Submission not found"
        }

    submission.status = status_data.status

    db.commit()
    db.refresh(submission)

    return {
        "message": "Submission status updated successfully",
        "data": {
            "id": submission.id,
            "complaint_id": f"CMP-{submission.id}",
            "status": submission.status
        }
    }
    

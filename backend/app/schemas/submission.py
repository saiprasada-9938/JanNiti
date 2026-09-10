from pydantic import BaseModel, Field
from typing import Optional, Literal


class SubmissionCreate(BaseModel):

    title: str = Field(..., min_length=5, max_length=150)
    description: str = Field(..., min_length=10, max_length=2000)

    category: str
    severity: Literal["Low", "Medium", "High"]

    name: str
    phone: str

    village: str
    district: str

    language: str

    ward: Optional[str] = None

    latitude: float
    longitude: float

    photo_filename: Optional[str] = None
    photo_analysis: Optional[str] = None


class SubmissionStatusUpdate(BaseModel):
    status: Literal[
        "Submitted",
        "Under Review",
        "Action Planned",
        "Resolved"
    ]

class SimilarComplaintRequest(BaseModel):
    title: str = Field(..., min_length=3, max_length=150)
    description: str = Field(..., min_length=5, max_length=2000)
    category: Optional[str] = None
    limit: int = Field(default=3, ge=1, le=5)

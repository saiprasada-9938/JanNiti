from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.api.submissions import router as submission_router
from app.auth.router import router as auth_router
from app.database.database import Base, engine

# Ensure the submissions table (and any other mapped tables) exist.
# This is additive / a no-op when the tables already exist.
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="CivicAI API",
    description="AI-powered constituency development planning platform",
    version="0.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(submission_router)

# Serve analyzed complaint photographs during the demo.
# Serve uploaded complaint photographs
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
upload_dir = os.path.join(BASE_DIR, "uploads")
os.makedirs(upload_dir, exist_ok=True)

app.mount(
    "/uploads",
    StaticFiles(directory=upload_dir),
    name="uploads"
)


@app.get("/")
def root():
    return {
        "message": "CivicAI API is running",
        "version": "0.1.0"
    }
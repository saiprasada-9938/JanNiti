# Parakram Hackathon — CivicAI / JanNiti

AI-powered civic complaint platform. Citizens submit complaints (with optional photo,
voice, and automatic "similar complaint" detection); the backend classifies them with
a scikit-learn ML model, runs Gemini text + photo analysis, and ranks issues by a
transparent priority score for the district administration dashboard.

## Repository layout

```
backend/
  main.py                  FastAPI entrypoint (uvicorn main:app)
  requirements.txt
  civicai.db               SQLite demo database (30 seed complaints) — committed on purpose
  .env.example             Copy to .env and fill in
  .gitignore
  uploads/                  Runtime citizen photo evidence (gitignored, auto-created)
  app/
    __init__.py
    api/submissions.py      Public + admin-protected complaint endpoints
    auth/router.py          POST /api/auth/login, GET /api/auth/verify (JWT + bcrypt)
    auth/dependencies.py    get_current_admin dependency (HTTP Bearer)
    database/database.py    SQLAlchemy engine / session / Base
    models/submission.py    SQLAlchemy model (submissions table)
    schemas/submission.py   Pydantic request/response models
    services/ai_service.py      Gemini text analysis
    services/photo_service.py   Photo validation + Gemini photo analysis
    services/priority_service.py Transparent priority scoring
    services/similar_service.py  Similar complaint detection
    ml/ml_service.py           Loads complaint_classifier.pkl and classifies
    ml/complaint_classifier.pkl ML model (runtime dependency of ml_service.py)
  scripts/                  Legacy / one-off helpers (not used at runtime)
    add_*.py                One-off DB migration scripts (obsolete once
                            create_all heads-up initialization exists in main.py)
    train_model.py          Retrains the ML classifier
    training_data.csv       Training data for train_model.py
    test_ai.py              Quick check that Gemini text analysis works
frontend/
  index.html                Unified single-page app (landing + citizen + admin)
  styles.css
  app.js                    All frontend logic (window.CIVICAI_API_URL aware)
```

## Run locally

### Backend

```bash
cd backend
python -m venv venv
venv/Scripts/activate              # Windows  (Linux/macOS: source venv/bin/activate)
pip install -r requirements.txt
# IMPORTANT: if backend/.env already exists, DO NOT overwrite it.
# Only if it does NOT exist yet, create it from the template:
copy .env.example .env             # Windows  (Linux/macOS: cp .env.example .env)
# then fill in GEMINI_API_KEY, ADMIN_USERNAME, ADMIN_PASSWORD (bcrypt hash), JWT_SECRET
uvicorn main:app --reload --port 8010
```

- API root: `http://127.0.0.1:8010/`
- Swagger UI: `http://127.0.0.1:8010/docs`
- On startup `main.py` calls `Base.metadata.create_all(bind=engine)` so the
  `submissions` table is created automatically on a fresh database. Against the
  committed demo `civicai.db` this is a no-op — the existing 30 rows are untouched.
- The `uploads/` folder is created automatically at startup; it is gitignored.

### Frontend

```bash
cd frontend
python -m http.server 8080
```

Open `http://127.0.0.1:8080`. The frontend calls the backend at
`window.CIVICAI_API_URL` which `frontend/index.html` sets to
`http://127.0.0.1:8010` for local dev.

### Admin login

Username is `ADMIN_USERNAME` from `backend/.env` (default `admin`). The password is
whatever you hashed into `ADMIN_PASSWORD` — generate it with:

```python
import bcrypt; print(bcrypt.hashpw(b"yourpassword", bcrypt.gensalt()).decode())
```

## Deploy

### Backend (Render)

- Runtime: Python 3.12+
- Build command: `pip install -r requirements.txt`
- Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- Set the three env vars + `GEMINI_API_KEY` in the Render dashboard (see
  `backend/.env.example`).

### Frontend (Vercel / Netlify)

- Serve the `frontend/` folder as a static site (no build step).
- In `frontend/index.html`, change the line
  `window.CIVICAI_API_URL = "http://127.0.0.1:8010";` to your hosted backend URL,
  e.g. `window.CIVICAI_API_URL = "https://civicai.onrender.com";`
- CORS already allows all origins for the demo.

### Important: ephemeral storage on free tiers

Render's free tier has an ephemeral filesystem that is reset on every redeploy:

- `backend/civicai.db` is committed to the repo **with its demo data intact** so the
  pitch always loads with 30 seeded complaints. Committing a SQLite file that is being
  written by a running server can rarely cause SQLite WAL/locking oddities; for a
  hackathon this is acceptable, but do not rely on it for real data.
- New citizen submissions made during a live demo are stored in the ephemeral DB and
  **will not survive a redeploy**.
- `backend/uploads/` (citizen photo evidence) is similarly ephemeral and gitignored;
  photo links from past submissions may 404 after a redeploy. Acceptable for a
  hackathon demo.

## Notes for judges / maintainers

- `backend/scripts/` holds legacy one-off migration and model-training helpers. They
  are not imported by the running app. If the ML model ever needs retraining, run
  `python scripts/train_model.py` from `backend/` and copy the produced
  `complaint_classifier.pkl` back into `backend/app/ml/` (the app loads it from that
  exact path at import time).
- The Gemini model name used by `ai_service.py` / `photo_service.py` is
  `gemini-3.6-flash`; update it if your account uses a different alias.
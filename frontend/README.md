# CivicAI prototype — improved admin review

## What changed

- The admin **View** modal now displays the actual citizen-uploaded evidence photo from the backend's `/uploads` endpoint.
- AI image output is converted from raw JSON into a short issue title and a clear evidence statement.
- There is one visible complaint severity: the photo AI assessment when available. The priority algorithm's former **Severity** label is now **Urgency contribution**, so it is not mistaken for a second severity result.
- The priority table headings now match the data shown in every column.
- AI summaries are normalized and capped at 240 characters for quick scanning.

## Run locally

1. In `backend`, create and activate a Python 3.13 virtual environment.
2. Install the dependencies with `pip install -r requirements.txt`.
3. Create `backend/.env` with `GEMINI_API_KEY=your_key`.
4. Start the API: `uvicorn app.main:app --reload`.
5. Open `citizen/index.html` and `admin/admin.html` with a local static server. Both expect the API at `http://127.0.0.1:8010`.

For the demo, submit a complaint with a JPG, PNG, or WebP image; then open the complaint from the admin dashboard and select **View**.

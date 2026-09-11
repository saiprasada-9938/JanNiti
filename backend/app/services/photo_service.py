import json
import os
import uuid

from google import genai
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY")
if not API_KEY:
    raise RuntimeError("GEMINI_API_KEY is not configured")

client = genai.Client(api_key=API_KEY)


def _parse_json(text: str) -> dict:
    text = (text or "").strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text.startswith("json"):
            text = text[4:].strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return {
            "issue_type": "Unable to determine",
            "description": text[:1000],
            "severity": "Unknown",
            "visible_evidence": "",
            "suggested_category": "Other",
        }


def analyze_photo(image_bytes: bytes, mime_type: str) -> dict:
    prompt = """
You are CivicAI's visual complaint-analysis assistant.
Inspect the uploaded civic-problem photograph and return ONLY valid JSON:
{
  "issue_type": "short name of the visible problem",
  "description": "what is visibly wrong, without inventing hidden facts",
  "severity": "Low, Medium, or High",
  "visible_evidence": "specific visible evidence supporting the assessment",
  "suggested_category": "Road, Water, Drainage, Electricity, Sanitation, Streetlight, Education, Healthcare, Transport, Employment, or Other"
}
If the image does not clearly show a civic issue, say so and use Other.
"""

    response = client.models.generate_content(
        model="gemini-3.6-flash",
        contents=[
            prompt,
            genai.types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
        ],
    )
    return _parse_json(response.text)


def save_photo(image_bytes: bytes, original_name: str, upload_dir: str) -> str:
    """Save uploaded complaint photo safely."""

    upload_dir = os.path.abspath(upload_dir)
    os.makedirs(upload_dir, exist_ok=True)

    extension = os.path.splitext(original_name or "")[1].lower()

    if extension not in {".jpg", ".jpeg", ".png", ".webp"}:
        extension = ".jpg"

    filename = f"{uuid.uuid4().hex}{extension}"

    file_path = os.path.abspath(
        os.path.join(upload_dir, filename)
    )

    with open(file_path, "wb") as file:
        file.write(image_bytes)

    if not os.path.isfile(file_path):
        raise RuntimeError(
            f"Photo was not saved successfully: {file_path}"
        )

    print(f"[PHOTO] Saved successfully: {file_path}")
    print(f"[PHOTO] Size: {os.path.getsize(file_path)} bytes")

    return filename
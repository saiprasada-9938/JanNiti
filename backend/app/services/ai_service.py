import os
from dotenv import load_dotenv
from google import genai

load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY")

if not API_KEY:
    raise RuntimeError("GEMINI_API_KEY is not configured")

client = genai.Client(api_key=API_KEY)


def analyze_complaint(title: str, description: str):
    prompt = f"""
You are an AI assistant for CivicAI, a civic complaint management system.

Analyze this citizen complaint.

Title:
{title}

Description:
{description}

Return ONLY valid JSON with these fields:

{{
    "summary": "short summary of the complaint",
    "category": "best category such as Road, Water, Drainage, Electricity, Sanitation, Other",
    "department": "government department that should handle this issue",
    "keywords": ["keyword1", "keyword2", "keyword3"]
}}
"""

    response = client.models.generate_content(
        model="gemini-3.6-flash",
        contents=prompt,
    )

    return response.text
import os
import secrets
from datetime import datetime, timedelta, timezone

import bcrypt
from fastapi import APIRouter, HTTPException
from jose import JWTError, jwt
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))

router = APIRouter(prefix="/api/auth", tags=["Auth"])

ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD_HASH = os.getenv("ADMIN_PASSWORD_HASH") or os.getenv("ADMIN_PASSWORD", "")
JWT_SECRET = os.getenv("JWT_SECRET")
if not JWT_SECRET:
    raise RuntimeError("JWT_SECRET is not configured")
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 24


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


@router.post("/login", response_model=TokenResponse)
def admin_login(body: LoginRequest):
    if body.username != ADMIN_USERNAME:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not ADMIN_PASSWORD_HASH:
        raise HTTPException(status_code=500, detail="Admin password not configured")

    password_valid = bcrypt.checkpw(
        body.password.encode("utf-8"),
        ADMIN_PASSWORD_HASH.encode("utf-8"),
    )

    if not password_valid:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    expire = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRY_HOURS)
    token = jwt.encode({"sub": body.username, "exp": expire}, JWT_SECRET, algorithm=JWT_ALGORITHM)

    return TokenResponse(access_token=token)


@router.get("/verify")
def verify_token(token: str):
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        username = payload.get("sub")
        if username != ADMIN_USERNAME:
            raise HTTPException(status_code=401, detail="Invalid token")
        return {"valid": True, "username": username}
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

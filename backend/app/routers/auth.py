# app/routers/auth.py

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, status
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from jose import jwt

from app.config import settings, GOOGLE_CLIENT_ID, ADMIN_EMAILS
from app.schemas.auth import GoogleAuthIn, TokenOut, UserOut

router = APIRouter(prefix="/api/auth", tags=["Auth"])


def create_access_token(data: dict, expires_minutes: int | None = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=expires_minutes or settings.TOKEN_EXPIRE_MINUTES
    )
    to_encode.update({"exp": expire})
    return jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm="HS256",
    )

@router.options("/google")
def google_options():
    return {}

@router.post("/google", response_model=TokenOut)
def google_login(payload: GoogleAuthIn):
    # 1) Verify the Google ID token with Google
    try:
        idinfo = id_token.verify_oauth2_token(
            payload.id_token,
            google_requests.Request(),
            GOOGLE_CLIENT_ID,
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Google token",
        )

    email = idinfo.get("email")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No email in Google token",
        )

    # 2) Decide if this user is an admin
    allowed_admins = {e.lower() for e in ADMIN_EMAILS}
    is_admin = email.lower() in allowed_admins

    # 3) Create our own JWT
    token = create_access_token(
        {
            "sub": email,
            "role": "admin" if is_admin else "user",
        }
    )

    # 4) Return token + basic user info to frontend
    user = UserOut(
        email=email,
        name=idinfo.get("name"),
        picture=idinfo.get("picture"),
    )

    print("GOOGLE EMAIL =", email)
    print("ADMIN_EMAILS =", ADMIN_EMAILS)

    return TokenOut(
        access_token=token,
        token_type="bearer",
        user=user,
        is_admin=is_admin,
    )

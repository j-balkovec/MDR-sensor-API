# app/security.py

from fastapi import Depends, HTTPException, status, Header
from pydantic import BaseModel
from google.oauth2 import id_token
from google.auth.transport import requests

from app.config import GOOGLE_CLIENT_ID, ADMIN_EMAILS
from fastapi import Header, HTTPException, status
from app.config import ADMIN_API_KEY

class User(BaseModel):
    email: str
    name: str | None = None
    picture: str | None = None


def get_current_user(authorization: str = Header(..., alias="Authorization")) -> User:
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid auth header",
        )

    token = authorization.split(" ", 1)[1].strip()
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing token",
        )

    try:
        # verify against your Google Client ID
        idinfo = id_token.verify_oauth2_token(
            token, requests.Request(), GOOGLE_CLIENT_ID
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Google token",
        )

    email = idinfo.get("email")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No email in token",
        )

    return User(
        email=email,
        name=idinfo.get("name"),
        picture=idinfo.get("picture"),
    )


def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.email not in ADMIN_EMAILS:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not an admin",
        )
    return user

"""Simple signed-token auth for the accounts area."""

from __future__ import annotations

import hashlib
import hmac
import json
import time
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import get_settings

_bearer = HTTPBearer(auto_error=False)


def _sign(payload: str) -> str:
    secret = get_settings().accounts_auth_secret.encode("utf-8")
    return hmac.new(secret, payload.encode("utf-8"), hashlib.sha256).hexdigest()


def create_access_token(username: str) -> tuple[str, int]:
    settings = get_settings()
    expires_at = int(time.time()) + settings.accounts_token_ttl_hours * 3600
    body = json.dumps({"u": username, "exp": expires_at}, separators=(",", ":"))
    token = f"{body}.{_sign(body)}"
    return token, expires_at


def verify_access_token(token: str) -> str:
    try:
        body, signature = token.rsplit(".", 1)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        ) from exc

    if not hmac.compare_digest(_sign(body), signature):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )

    try:
        data = json.loads(body)
        username = str(data["u"])
        expires_at = int(data["exp"])
    except (KeyError, TypeError, ValueError, json.JSONDecodeError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        ) from exc

    if expires_at < int(time.time()):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired",
        )
    return username


def authenticate_user(username: str, password: str) -> bool:
    settings = get_settings()
    user_ok = hmac.compare_digest(
        username.strip(),
        settings.accounts_username,
    )
    pass_ok = hmac.compare_digest(password, settings.accounts_password)
    return user_ok and pass_ok


def require_accounts_user(
    credentials: Annotated[
        HTTPAuthorizationCredentials | None,
        Depends(_bearer),
    ] = None,
) -> str:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return verify_access_token(credentials.credentials)

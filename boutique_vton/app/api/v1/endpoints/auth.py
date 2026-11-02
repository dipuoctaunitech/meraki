"""Auth endpoints for accounts access."""

from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, status

from app.core.auth import (
    authenticate_user,
    create_access_token,
    require_accounts_user,
)

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=80)
    password: str = Field(min_length=1, max_length=200)


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_at: int
    username: str


class MeResponse(BaseModel):
    username: str


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest) -> LoginResponse:
    if not authenticate_user(payload.username, payload.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )
    token, expires_at = create_access_token(payload.username.strip())
    return LoginResponse(
        access_token=token,
        expires_at=expires_at,
        username=payload.username.strip(),
    )


@router.get("/me", response_model=MeResponse)
def me(username: str = Depends(require_accounts_user)) -> MeResponse:
    return MeResponse(username=username)

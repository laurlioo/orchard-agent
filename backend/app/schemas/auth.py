"""认证相关 Pydantic 模型。"""
from datetime import datetime
from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    username: str = Field(..., min_length=1, max_length=50)
    password: str = Field(..., min_length=1, max_length=100)


class WorkerLoginRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)
    phone: str = Field(..., min_length=1, max_length=20)
    orchard: str = Field("peach", pattern="^(peach|grape)$")


class SetupRequest(BaseModel):
    username: str = Field(..., min_length=1, max_length=50)
    password: str = Field(..., min_length=6, max_length=100)
    setup_token: str = Field("", max_length=200)


class ResetPasswordRequest(BaseModel):
    username: str | None = None
    new_password: str = Field(..., min_length=6, max_length=100)
    setup_token: str = Field(..., min_length=1, max_length=200)


class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=1, max_length=50)
    password: str = Field(..., min_length=6, max_length=100)
    role: str = Field("viewer", pattern="^(admin|viewer)$")


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    username: str
    worker_id: int | None = None


class UserOut(BaseModel):
    id: int
    username: str
    role: str
    created_at: datetime

    class Config:
        from_attributes = True

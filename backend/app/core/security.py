"""认证工具：JWT 生成/验证、密码哈希、FastAPI 依赖。"""
import os
from datetime import datetime, timedelta, timezone
from typing import Optional

import jwt
from fastapi import Depends, HTTPException, Request
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.models.user import User

JWT_SECRET = settings.JWT_SECRET
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = int(os.getenv("JWT_EXPIRE_HOURS", "72"))

# 密码哈希
pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain: str) -> str:
    return pwd_ctx.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_ctx.verify(plain, hashed)


def create_token(user_id: int, username: str, role: str, kind: str = "staff") -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "username": username,
        "role": role,
        "kind": kind,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(hours=JWT_EXPIRE_HOURS)).timestamp()),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])


def _extract_user(request: Request, db: Session) -> Optional[User]:
    """从 Authorization header 解析当前用户。"""
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None
    token = auth[7:]
    try:
        payload = decode_token(token)
    except Exception:
        return None
    user_id = int(payload.get("sub", 0))
    return db.get(User, user_id) if user_id else None


def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    """依赖：要求已登录，返回 User。"""
    user = _extract_user(request, db)
    if not user:
        raise HTTPException(401, "未登录或 token 无效")
    return user


def require_admin(user: User = Depends(get_current_user)) -> User:
    """依赖：要求管理员角色。"""
    if user.role != "admin":
        raise HTTPException(403, "需要管理员权限")
    return user

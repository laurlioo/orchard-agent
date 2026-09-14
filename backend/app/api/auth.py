"""认证路由：登录 / 注册（仅 admin） / 当前用户。"""
import os

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import (
    create_token,
    get_current_user,
    hash_password,
    require_admin,
    verify_password,
)
from app.models.user import User
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    u = db.query(User).filter(User.username == payload.username).first()
    if not u or not verify_password(payload.password, u.password_hash):
        raise HTTPException(401, "用户名或密码错误")
    token = create_token(u.id, u.username, u.role)
    return TokenResponse(access_token=token, role=u.role, username=u.username)


@router.post("/register", response_model=UserOut, status_code=201)
def register(
    payload: RegisterRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """注册新用户：仅管理员可调用。"""
    if db.query(User).filter(User.username == payload.username).first():
        raise HTTPException(400, "用户名已存在")
    u = User(
        username=payload.username,
        password_hash=hash_password(payload.password),
        role=payload.role,
    )
    db.add(u)
    db.commit()
    db.refresh(u)
    return u


@router.get("/me", response_model=UserOut)
def me(current: User = Depends(get_current_user)):
    return current


@router.post("/setup", response_model=TokenResponse)
def setup_initial_admin(payload: LoginRequest, db: Session = Depends(get_db)):
    """首次初始化管理员账号：仅在 users 表为空时可用，防止被滥用。

    前端首次访问会检测 /auth/setup 状态，如果需要初始化则引导设置管理员。
    """
    if db.query(User).count() > 0:
        raise HTTPException(400, "管理员已存在，请联系管理员分配账号")
    u = User(
        username=payload.username,
        password_hash=hash_password(payload.password),
        role="admin",
    )
    db.add(u)
    db.commit()
    db.refresh(u)
    token = create_token(u.id, u.username, u.role)
    return TokenResponse(access_token=token, role=u.role, username=u.username)


@router.get("/status")
def auth_status(db: Session = Depends(get_db)):
    """检查系统是否已初始化（是否有管理员账号）。"""
    has_admin = db.query(User).count() > 0
    return {"initialized": has_admin}

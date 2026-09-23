"""认证路由：管理员登录 / 工人按姓名登录 / 注册 / 当前用户。"""
import hmac

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.security import (
    create_token,
    get_current_user,
    hash_password,
    require_admin,
    verify_password,
)
from app.models.user import User
from app.models.worker import Worker
from app.schemas.auth import (
    LoginRequest,
    RegisterRequest,
    ResetPasswordRequest,
    SetupRequest,
    TokenResponse,
    UserOut,
    WorkerLoginRequest,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    u = db.query(User).filter(User.username == payload.username).first()
    if not u or not verify_password(payload.password, u.password_hash):
        raise HTTPException(401, "用户名或密码错误")
    token = create_token(u.id, u.username, u.role, kind="staff")
    return TokenResponse(access_token=token, role=u.role, username=u.username)


@router.post("/worker-login", response_model=TokenResponse)
def worker_login(payload: WorkerLoginRequest, db: Session = Depends(get_db)):
    """工人用档案姓名 + 登记手机号登录，只能查看本人的工时和工资。"""
    name = payload.name.strip()
    phone = payload.phone.strip()
    orchard = payload.orchard
    rows = db.query(Worker).filter(Worker.name == name, Worker.orchard == orchard).all()
    if not rows:
        raise HTTPException(401, "未找到该姓名，请与档案上的姓名完全一致")
    active = [w for w in rows if w.active]
    if not active:
        raise HTTPException(401, "该工人已停用，请联系管理员")
    matches = [w for w in active if (w.phone or "").strip() == phone]
    if not matches:
        raise HTTPException(401, "手机号不匹配或未登记，请联系管理员核实档案信息")
    if len(matches) > 1:
        raise HTTPException(400, "存在同名且手机号相同的在职工人，请联系管理员处理后再登录")
    w = matches[0]
    token = create_token(w.id, w.name, "worker", kind="worker")
    return TokenResponse(
        access_token=token,
        role="worker",
        username=w.name,
        worker_id=w.id,
    )


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


@router.get("/me")
def me(request: Request, db: Session = Depends(get_db)):
    role = getattr(request.state, "user_role", "")
    uid = getattr(request.state, "user_id", 0)
    if role == "worker":
        w = db.get(Worker, uid)
        if not w:
            raise HTTPException(401, "工人不存在或已删除")
        return {
            "id": w.id,
            "username": w.name,
            "role": "worker",
            "worker_id": w.id,
            "created_at": w.created_at,
        }
    current = get_current_user(request, db)
    return current


@router.post("/setup", response_model=TokenResponse)
def setup_initial_admin(payload: SetupRequest, db: Session = Depends(get_db)):
    """首次初始化管理员账号：仅在 users 表为空时可用。"""
    if db.query(User).count() > 0:
        raise HTTPException(400, "管理员已存在，请联系管理员分配账号")
    if settings.setup_requires_token and not hmac.compare_digest(
        payload.setup_token.encode(), settings.SETUP_TOKEN.encode()
    ):
        raise HTTPException(403, "初始化密钥错误")
    u = User(
        username=payload.username,
        password_hash=hash_password(payload.password),
        role="admin",
    )
    db.add(u)
    db.commit()
    db.refresh(u)
    token = create_token(u.id, u.username, u.role, kind="staff")
    return TokenResponse(access_token=token, role=u.role, username=u.username)


@router.get("/status")
def auth_status(db: Session = Depends(get_db)):
    """检查系统是否已初始化（是否有管理员账号）。"""
    has_admin = db.query(User).count() > 0
    return {
        "initialized": has_admin,
        "setup_token_required": settings.setup_requires_token,
    }


@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    """用 SETUP_TOKEN 重置密码（找回管理员/用户密码）。"""
    if not settings.setup_requires_token or not hmac.compare_digest(
        payload.setup_token.encode(), settings.SETUP_TOKEN.encode()
    ):
        raise HTTPException(403, "重置密钥错误")
    user = None
    if payload.username:
        user = db.query(User).filter(User.username == payload.username).first()
    else:
        user = db.query(User).order_by(User.id).first()
    if not user:
        raise HTTPException(404, "用户不存在")
    user.password_hash = hash_password(payload.new_password)
    db.commit()
    return {"ok": True, "username": user.username}

"""FastAPI 入口：挂载路由 + CORS + 认证中间件 + 启动时建表。"""
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

from sqlalchemy import text

from app.core.config import settings
from app.core.database import init_db, engine
from app.core.security import decode_token
from app.api import auth, workers, worklogs, production, issues, wages, reports, agent

AUTH_WHITELIST = {
    "/",
    "/auth/login",
    "/auth/worker-login",
    "/auth/setup",
    "/auth/status",
    "/agent/health",
}
# 工人姓名登录后仅允许查自己的工时和工资
WORKER_ALLOWED = {
    ("GET", "/auth/me"),
    ("GET", "/worklogs"),
    ("GET", "/wages"),
}
if settings.docs_enabled:
    AUTH_WHITELIST.update({"/docs", "/openapi.json", "/redoc", "/docs/oauth2-redirect"})


class AuthMiddleware(BaseHTTPMiddleware):
    """全局认证：白名单外的接口都要求 Bearer token。"""

    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        if request.method == "OPTIONS":
            return await call_next(request)
        if path in AUTH_WHITELIST:
            return await call_next(request)

        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
        else:
            return JSONResponse(status_code=401, content={"detail": "未登录"})

        try:
            payload = decode_token(token)
            request.state.user_id = int(payload.get("sub", 0))
            request.state.user_role = payload.get("role", "viewer")
        except Exception:
            return JSONResponse(status_code=401, content={"detail": "token 无效或已过期"})

        if request.state.user_role == "worker":
            if (request.method, path) not in WORKER_ALLOWED:
                return JSONResponse(status_code=403, content={"detail": "工人账号只能查看本人的工时和工资"})

        return await call_next(request)


def _migrate_schema():
    """启动时自动补列/索引（Turso 上已有旧表时需要）。"""
    ALTERS = [
        ("workers", "overtime_rate", "ALTER TABLE workers ADD COLUMN overtime_rate FLOAT DEFAULT 1.5"),
        ("work_logs", "overtime_hours", "ALTER TABLE work_logs ADD COLUMN overtime_hours FLOAT DEFAULT 0"),
        ("work_logs", "hourly_rate", "ALTER TABLE work_logs ADD COLUMN hourly_rate FLOAT"),
        ("work_logs", "overtime_rate", "ALTER TABLE work_logs ADD COLUMN overtime_rate FLOAT"),
    ]
    with engine.connect() as conn:
        for table, col, sql in ALTERS:
            try:
                result = conn.execute(text(
                    f"SELECT COUNT(*) FROM pragma_table_info('{table}') WHERE name='{col}'"
                ))
                if result.scalar() == 0:
                    conn.execute(text(sql))
                    conn.commit()
            except Exception:
                pass

        try:
            conn.execute(text(
                """
                UPDATE work_logs
                SET hourly_rate = (
                    SELECT hourly_rate FROM workers WHERE workers.id = work_logs.worker_id
                )
                WHERE hourly_rate IS NULL
                """
            ))
            conn.execute(text(
                """
                UPDATE work_logs
                SET overtime_rate = (
                    SELECT overtime_rate FROM workers WHERE workers.id = work_logs.worker_id
                )
                WHERE overtime_rate IS NULL
                """
            ))
            conn.commit()
        except Exception:
            pass

        for idx_sql in (
            "CREATE UNIQUE INDEX IF NOT EXISTS uq_work_logs_worker_date ON work_logs(worker_id, date)",
            "CREATE UNIQUE INDEX IF NOT EXISTS uq_production_logs_cat_date ON production_logs(category_id, date)",
        ):
            try:
                conn.execute(text(idx_sql))
                conn.commit()
            except Exception:
                pass


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings.assert_secure()
    init_db()
    _migrate_schema()
    yield


docs_url = "/docs" if settings.docs_enabled else None
app = FastAPI(
    title="果园管理 Agent 助手",
    description="工时工资、产量毛利、日报周报月报、问题工单，由 DeepSeek 驱动的 Agent",
    version="0.3.0",
    lifespan=lifespan,
    docs_url=docs_url,
    redoc_url="/redoc" if settings.docs_enabled else None,
    openapi_url="/openapi.json" if settings.docs_enabled else None,
)

_cors_env = os.getenv("CORS_ORIGINS", "")
cors_origins = [o.strip() for o in _cors_env.split(",") if o.strip()]
if not cors_origins:
    cors_origins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(AuthMiddleware)

app.include_router(auth.router)
app.include_router(workers.router)
app.include_router(worklogs.router)
app.include_router(production.cat_router)
app.include_router(production.log_router)
app.include_router(issues.router)
app.include_router(wages.router)
app.include_router(reports.router)
app.include_router(agent.router)


@app.get("/")
def root():
    return {"name": "果园管理 Agent 助手", "docs": "/docs" if settings.docs_enabled else None}

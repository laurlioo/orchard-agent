"""FastAPI 入口：挂载路由 + CORS + 认证中间件 + 启动时建表。"""
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

from app.core.database import init_db
from app.core.security import decode_token
from app.api import auth, workers, worklogs, production, issues, wages, reports, agent
from app.models.user import User
from app.core.database import SessionLocal

# 白名单：无需登录即可访问
AUTH_WHITELIST = {
    "/",
    "/docs",
    "/openapi.json",
    "/redoc",
    "/agent/health",
    "/auth/login",
    "/auth/setup",
    "/auth/status",
}


class AuthMiddleware(BaseHTTPMiddleware):
    """全局认证：白名单外的接口都要求 Bearer token。"""

    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        # 白名单放行
        if path in AUTH_WHITELIST:
            return await call_next(request)

        auth_header = request.headers.get("Authorization", "")
        # Excel 下载等场景用 query 参数传 token（window.open 无法设 header）
        query_token = request.query_params.get("token", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
        elif query_token:
            token = query_token
        else:
            return JSONResponse(status_code=401, content={"detail": "未登录"})

        try:
            payload = decode_token(token)
            request.state.user_id = int(payload.get("sub", 0))
            request.state.user_role = payload.get("role", "viewer")
        except Exception:
            return JSONResponse(status_code=401, content={"detail": "token 无效或已过期"})

        return await call_next(request)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 启动时建表
    init_db()
    yield


app = FastAPI(
    title="果园管理 Agent 助手",
    description="工时工资、产量毛利、日报周报月报、问题工单，由 DeepSeek 驱动的 Agent",
    version="0.2.0",
    lifespan=lifespan,
)

# CORS 允许来源：本地开发 + Vercel 部署域名（通过 CORS_ORIGINS 环境变量配置，逗号分隔）
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

# 路由
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
    return {"name": "果园管理 Agent 助手", "docs": "/docs"}

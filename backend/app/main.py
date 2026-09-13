"""FastAPI 入口：挂载路由 + CORS + 启动时建表。"""
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.database import init_db
from app.api import workers, worklogs, production, issues, wages, reports, agent


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 启动时建表
    init_db()
    yield


app = FastAPI(
    title="果园管理 Agent 助手",
    description="工时工资、产量毛利、日报周报月报、问题工单，由 DeepSeek 驱动的 Agent",
    version="0.1.0",
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

# 路由
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

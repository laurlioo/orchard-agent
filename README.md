# 果园管理 Agent 助手

面向果园日常运营的轻量管理系统：工时工资、产量毛利、日/周/月报、问题工单，并由 DeepSeek 驱动的对话式 Agent 辅助查询与汇总。

## 技术栈

- 后端：Python + FastAPI + SQLAlchemy + SQLite（本地）/ Turso（托管 SQLite）
- 前端：React + Vite + TypeScript + Tailwind CSS + Recharts
- AI：DeepSeek Chat Completions（支持 function calling 与流式输出）

## 目录结构

```
backend/    FastAPI 应用：api / models / schemas / services / agent
frontend/   React 应用：pages / components / api / lib
```

## 本地启动

### 后端

```powershell
cd backend
pip install -r requirements.txt
cp .env.example .env   # 填入 DEEPSEEK_API_KEY 等
uvicorn app.main:app --reload --port 8000
```

文档地址：`http://localhost:8000/docs`（本地开发默认开启）。

### 前端

```powershell
cd frontend
npm install
npm run dev   # http://localhost:5173
```

前端默认请求 `http://localhost:8000`，如需改地址，设置 `VITE_API_BASE_URL`。

## 环境变量

后端 `.env` 主要配置：

| 变量 | 说明 |
|---|---|
| `DEEPSEEK_API_KEY` | DeepSeek API key |
| `DEEPSEEK_BASE_URL` | DeepSeek 基地址，默认 `https://api.deepseek.com` |
| `DEEPSEEK_MODEL` | 模型名，默认 `deepseek-chat` |
| `DB_PATH` | 本地 SQLite 路径，默认 `./orchard.db` |
| `DATABASE_URL` | Turso 地址（`libsql://...`），配置后优先使用 |
| `DATABASE_AUTH_TOKEN` | Turso auth token |
| `APP_ENV` | `development` / `production` |
| `JWT_SECRET` | JWT 密钥（生产必填，且不能用默认值） |
| `SETUP_TOKEN` | 初始化/重置管理员密码所需的密钥（生产必填） |
| `CORS_ORIGINS` | 允许的前端来源，逗号分隔 |

## 部署

- 后端：Render（根目录 `backend`，启动命令 `uvicorn app.main:app --host 0.0.0.0 --port $PORT`）
- 前端：Vercel（根目录 `frontend`，构建 `npm run build`，输出 `dist`）
- 数据：建议使用 Turso 托管 SQLite 以持久化数据

详细步骤见 `DEPLOY.md`。

## 密码重置

若忘记管理员密码，可在登录页点击「忘记密码？」，输入 `SETUP_TOKEN` 与新密码进行重置；也可调用：

```http
POST /auth/reset-password
{"username": "admin", "new_password": "新密码", "setup_token": "你的 SETUP_TOKEN"}
```

## 测试与检查

```powershell
cd backend && pytest
cd frontend && npm run build
```

推送后由 GitHub Actions 自动执行上述检查。

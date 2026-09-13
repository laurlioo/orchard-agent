# 部署指南：GitHub + Vercel + Render

把本项目变成公网可访问，分三步：**推代码到 GitHub → 部署后端到 Render → 部署前端到 Vercel**。

## 架构

```
用户浏览器 ──> Vercel（前端 React 静态页面）
                   │
                   ▼
              Render（后端 FastAPI + SQLite + DeepSeek）
```

---

## 第 1 步：推到 GitHub

1. 去 https://github.com/new 新建一个仓库（比如 `orchard-agent`），选 Public
2. 在项目根目录 `d:\Trae-Agent` 打开 PowerShell：
   ```powershell
   git init
   git add .
   git commit -m "orchard agent init"
   git branch -M main
   git remote add origin https://github.com/你的用户名/orchard-agent.git
   git push -u origin main
   ```

---

## 第 2 步：部署后端到 Render

Render 支持 Python 持续运行，免费额度够个人用。

1. 去 https://render.com 用 GitHub 登录
2. 点 **New → Web Service**
3. 选择你刚推的仓库
4. 配置：
   - **Name**: `orchard-agent-backend`
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. **Environment Variables**（在 Advanced 里添加）：
   | Key | Value |
   |---|---|
   | `DEEPSEEK_API_KEY` | 你的 DeepSeek key |
   | `DEEPSEEK_BASE_URL` | `https://api.deepseek.com` |
   | `DEEPSEEK_MODEL` | `deepseek-chat` |
   | `CORS_ORIGINS` | 先填 `*`，后面拿到 Vercel 域名后再改 |
   | `DB_PATH` | `./orchard.db` |
6. 点 **Create Web Service**，等 2-3 分钟构建完成
7. 记下 Render 给你的域名，比如 `https://orchard-agent-backend.onrender.com`

> ⚠️ **SQLite 限制**：Render 免费版的磁盘是临时的，每次重新部署数据会清空。如果需要数据持久化，请升级付费版并挂载 Disk，或换用 [Turso](https://turso.tech)（托管 SQLite，免费 9GB）。

---

## 第 3 步：部署前端到 Vercel

1. 去 https://vercel.com 用 GitHub 登录
2. 点 **Add New → Project**，选择你的仓库
3. 配置：
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. **Environment Variables** 添加：
   | Key | Value |
   |---|---|
   | `VITE_API_BASE_URL` | `https://orchard-agent-backend.onrender.com`（你上一步的后端域名） |
5. 点 **Deploy**，等 1-2 分钟
6. 拿到 Vercel 域名，比如 `https://orchard-agent.vercel.app`

---

## 第 4 步：配置 CORS（让前端能访问后端）

回到 Render 控制台，把 `CORS_ORIGINS` 改成你的 Vercel 域名：

```
CORS_ORIGINS=https://orchard-agent.vercel.app
```

保存后 Render 会自动重新部署。

---

## 完成

打开你的 Vercel 域名即可访问，任何人都能用。

### 常见问题

- **前端显示空白**：浏览器 F12 看 Console，如果是 CORS 错误，检查后端 `CORS_ORIGINS` 是否配了 Vercel 域名
- **Agent 没反应**：确认后端 `DEEPSEEK_API_KEY` 已填且账户有余额
- **数据丢失**：免费版 Render 磁盘临时，换 Turso 或挂载 Disk

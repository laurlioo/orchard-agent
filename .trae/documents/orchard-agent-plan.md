# 果园管理 Agent 助手 - 实施方案

## Context

用户是政府企业合作果园的运营者，每日需要：①结算工人工时并计算工资；②统计各品类农产品产量与毛利，向甲方输出日/周/月报；③收集果农与管理层上报的种植养护问题。目前这些工作靠人工/Excel 完成，效率低、易出错。

目标：搭建一个 **前后端分离** 的 Agent 助手，以 **结构化表单录入** 为主、**对话式 Agent** 为辅，用 DeepSeek API 驱动汇总分析与报表生成，把日常重复性工作自动化。

技术决策（已与用户确认）：
- 后端：Python + FastAPI
- 前端：React + Vite + Tailwind
- 存储：SQLite 单文件
- 交互：表单为主 + 保留 Agent 对话框
- 报表：Excel 导出 + 页面预览（含图表）+ AI 文字摘要
- LLM：DeepSeek API（默认 `deepseek-chat`，支持 function calling）

> **待确认**：问题上报流转方式用户选了"Other"未填具体内容。方案默认按 **系统内工单** 实现（果农/管理层在系统内提交、查看、回复），不接外部通知渠道。若需邮件/微信通知，在实施阶段补一个 hook 点即可。

---

## 目录结构

```
d:\Trae-Agent\
├── backend/
│   ├── app/
│   │   ├── main.py                 # FastAPI 入口，挂载路由 + CORS
│   │   ├── core/
│   │   │   ├── config.py           # DeepSeek API key、DB 路径、模型名
│   │   │   └── database.py         # SQLite 连接（SQLAlchemy）
│   │   ├── models/                 # ORM 模型
│   │   │   ├── worker.py
│   │   │   ├── work_log.py
│   │   │   ├── product.py
│   │   │   ├── production_log.py
│   │   │   └── issue.py
│   │   ├── schemas/                # Pydantic 校验
│   │   ├── api/
│   │   │   ├── workers.py
│   │   │   ├── worklogs.py
│   │   │   ├── production.py
│   │   │   ├── wages.py
│   │   │   ├── reports.py
│   │   │   ├── issues.py
│   │   │   └── agent.py            # POST /agent/chat
│   │   ├── agent/
│   │   │   ├── deepseek_client.py  # DeepSeek Chat Completions 封装
│   │   │   ├── tools.py            # Agent 可调用的工具（JSON Schema）
│   │   │   └── orchestrator.py     # Agent 主循环：msg→LLM→tool_calls→执行→回填→回复
│   │   └── services/
│   │       ├── wage_calculator.py  # 按工时×时薪算工资
│   │       ├── report_builder.py   # 日/周/月报聚合 + Excel 导出（openpyxl）
│   │       └── summary_writer.py   # 调 DeepSeek 生成文字摘要
│   ├── requirements.txt
│   ├── .env.example                # DEEPSEEK_API_KEY=, DB_PATH=, MODEL=
│   └── README.md                   # 启动命令
└── frontend/
    ├── src/
    │   ├── main.tsx
    │   ├── App.tsx                 # 路由 + 布局
    │   ├── components/
    │   │   ├── Layout.tsx          # 侧边栏 + 内容区 + 浮动聊天按钮
    │   │   ├── ChatPanel.tsx       # Agent 对话框（流式渲染）
    │   │   └── charts/             # Recharts 封装
    │   ├── pages/
    │   │   ├── Workers.tsx         # 工人管理
    │   │   ├── WorkLogs.tsx        # 每日工时录入
    │   │   ├── Production.tsx      # 每日产量录入
    │   │   ├── Wages.tsx           # 工资查询
    │   │   ├── Reports.tsx         # 日/周/月报预览 + 导出
    │   │   └── Issues.tsx          # 问题上报/列表/回复
    │   ├── api/                    # axios 客户端，按模块拆分
    │   └── types/                  # TS 类型
    ├── package.json
    ├── vite.config.ts
    └── tailwind.config.js
```

---

## 数据模型（SQLite）

| 表 | 关键字段 |
|---|---|
| `workers` | id, name, phone, role, hourly_rate, active |
| `work_logs` | id, worker_id, date, hours, task_desc, created_at |
| `product_categories` | id, name, unit, unit_price, cost_per_unit |
| `production_logs` | id, category_id, date, quantity, notes, created_at |
| `issues` | id, reporter_name, reporter_role, category, content, status(open/closed), assignee, reply, created_at, resolved_at |

毛利 = (unit_price − cost_per_unit) × quantity，按日期范围聚合。

---

## Agent 设计

DeepSeek Chat Completions API + function calling。Agent 不直接操作数据库，通过工具函数间接执行，所有工具在 `agent/tools.py` 注册：

**工具清单**：
- `get_worklogs(date)` — 查某日工时
- `get_production(start, end)` — 查产量
- `calculate_wages(date)` — 算某日工资（调 wage_calculator）
- `generate_report(period_start, period_end, type)` — 生成报表（调 report_builder）
- `write_summary(data)` — 调 DeepSeek 写文字摘要
- `create_issue(data)` — 新建问题工单
- `list_issues(status)` — 查问题列表

**编排流程**（`orchestrator.py`）：
1. 收到用户消息 + 历史对话
2. 调 DeepSeek，附带 tools schema
3. 若返回 `tool_calls` → 执行对应工具 → 把结果作为 `tool` role 消息回填 → 回到第 2 步
4. 直到返回最终文本 → 流式推给前端

**前端对话**：`ChatPanel` 浮动按钮展开，SSE 接收流式响应，支持展示工具调用过程（"正在查询今日工时..."）。

---

## 报表生成

- **数据聚合**：`report_builder.py` 按 date range 汇总产量/毛利/工时/工资
- **Excel 导出**：openpyxl 生成 .xlsx，含明细 sheet + 汇总 sheet
- **页面预览**：前端 Recharts 画柱状图（各品类产量）+ 趋势线（毛利走势）+ 表格
- **AI 摘要**：`summary_writer.py` 把聚合数据打包成 prompt 调 DeepSeek，生成一段自然语言总结（"今日产出 X 斤，毛利 Y 元，环比 Z%..."）

---

## 关键依赖

**后端** (`requirements.txt`)：
- fastapi, uvicorn[standard]
- sqlalchemy, pydantic
- openpyxl（Excel）
- httpx（调 DeepSeek）
- python-dotenv
- fastapi.responses.StreamingResponse（SSE）

**前端** (`package.json`)：
- react, react-dom, react-router-dom
- vite, @vitejs/plugin-react, typescript
- tailwindcss, postcss, autoprefixer
- axios
- recharts（图表）
- lucide-react（图标）

---

## 实施步骤

1. **后端骨架**：建 `backend/` 目录，写 `requirements.txt`、`.env.example`、`main.py`、`config.py`、`database.py`，初始化 SQLite + 5 张表，跑通 `uvicorn app.main:app --reload`
2. **CRUD API**：实现 workers / worklogs / production / issues 的 REST 端点
3. **业务服务**：`wage_calculator.py`（按日聚合工时×时薪）、`report_builder.py`（日/周/月聚合 + Excel 导出）
4. **Agent 模块**：`deepseek_client.py`（chat completions + tools）、`tools.py`（7 个工具）、`orchestrator.py`（主循环）、`api/agent.py`（SSE 端点）
5. **AI 摘要**：`summary_writer.py` 调 DeepSeek 生成报表文字总结
6. **前端骨架**：建 `frontend/`，`npm create vite`，配 Tailwind，搭 `Layout` + 路由
7. **前端页面**：Workers / WorkLogs / Production / Wages / Reports / Issues 六个页面 + 表单
8. **报表页**：Recharts 图表 + Excel 下载按钮 + AI 摘要展示
9. **ChatPanel**：浮动对话框，SSE 流式接 Agent
10. **联调验证**：见下

---

## 验证方式

1. **后端启动**：
   ```bash
   cd backend
   pip install -r requirements.txt
   cp .env.example .env   # 填入 DEEPSEEK_API_KEY
   uvicorn app.main:app --reload --port 8000
   ```
   访问 http://localhost:8000/docs 看 Swagger，确认所有端点可用。

2. **前端启动**：
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   访问 http://localhost:5173。

3. **端到端测试**（按用户实际工作流）：
   - 在 Workers 页录入 2 个工人，设置时薪
   - 在 WorkLogs 页录今日工时（如张三 8h、李四 6h）
   - 在 Production 页录今日苹果 500 斤、梨 300 斤
   - 在 Reports 页点"生成日报"→ 预期看到表格 + 柱状图 + AI 摘要 + 可下载 .xlsx
   - 打开 ChatPanel 输入"今天工资一共多少？"→ 预期 Agent 调 `calculate_wages` 工具，返回数字
   - 在 Issues 页提交一条问题 → 在 ChatPanel 问"今天有什么问题？"→ Agent 调 `list_issues` 返回

4. **DeepSeek 连通性**：在 `.env` 配好 key 后，单独测 `summary_writer.py` 能否正常返回摘要文本。

---

## 备注

- 时薪字段直接挂在 `workers` 表（同一工人时薪稳定）；若日后按岗位/时段浮动，再加 `wage_rules` 表
- Excel 导出按需在 `report_builder.py` 扩展模板，不依赖第三方模板引擎
- Agent 不做权限/多用户，单用户本地使用；后续要多人协作再补 auth
- DeepSeek 限流/失败由 `orchestrator.py` 简单重试一次，失败回友好提示

"""Agent 工具定义与执行器。

每个工具含两部分：
- TOOLS 列表中的 OpenAI function schema（传给 DeepSeek）
- EXECUTORS 字典中的实现函数（接收 db + args dict，返回 JSON 字符串）
"""
import json
from datetime import date, datetime
from typing import Callable

from sqlalchemy.orm import Session

from app.models.issue import Issue
from app.models.production_log import ProductionLog
from app.models.work_log import WorkLog
from app.models.worker import Worker
from app.services.report_builder import build_report
from app.services.summary_writer import write_summary
from app.services.wage_calculator import calc_wages


def _d(s: str | None) -> date:
    """解析 YYYY-MM-DD；缺省返回今天。"""
    if not s:
        return date.today()
    return datetime.strptime(s, "%Y-%m-%d").date()


def _json(obj) -> str:
    """把对象序列化为 JSON 字符串，处理 date/datetime。"""
    return json.dumps(obj, ensure_ascii=False, default=str, indent=2)


# ---- 工具实现 ----

def _get_workers(db: Session, args: dict) -> str:
    rows = db.query(Worker).order_by(Worker.id).all()
    return _json([
        {"id": w.id, "name": w.name, "role": w.role, "hourly_rate": w.hourly_rate,
         "active": w.active}
        for w in rows
    ])


def _get_worklogs(db: Session, args: dict) -> str:
    d = _d(args.get("date"))
    rows = (
        db.query(WorkLog)
        .filter(WorkLog.date == d)
        .order_by(WorkLog.id)
        .all()
    )
    return _json([
        {"id": r.id, "worker_id": r.worker_id, "worker_name": r.worker.name,
         "date": str(r.date), "hours": r.hours, "overtime_hours": r.overtime_hours,
         "task_desc": r.task_desc}
        for r in rows
    ])


def _get_production(db: Session, args: dict) -> str:
    s = _d(args.get("start"))
    e = _d(args.get("end"))
    if args.get("start") is None and args.get("end") is None:
        e = s  # 默认单日
    rows = (
        db.query(ProductionLog)
        .filter(ProductionLog.date >= s, ProductionLog.date <= e)
        .order_by(ProductionLog.date, ProductionLog.id)
        .all()
    )
    return _json([
        {"id": r.id, "category": r.category.name, "unit": r.category.unit,
         "date": str(r.date), "quantity": r.quantity, "notes": r.notes}
        for r in rows
    ])


def _calculate_wages(db: Session, args: dict) -> str:
    s = _d(args.get("start"))
    e = _d(args.get("end") or args.get("start"))
    rows = calc_wages(db, s, e)
    return _json({
        "period": f"{s}~{e}",
        "workers": [r.model_dump() for r in rows],
        "total_hours": round(sum(r.hours for r in rows), 2),
        "total_overtime_hours": round(sum(r.overtime_hours for r in rows), 2),
        "total_regular_wages": round(sum(r.regular_wage for r in rows), 2),
        "total_overtime_wages": round(sum(r.overtime_wage for r in rows), 2),
        "total_wages": round(sum(r.wage for r in rows), 2),
    })


def _generate_report(db: Session, args: dict) -> str:
    report_type = args.get("report_type", "daily")
    if report_type == "daily":
        s = e = _d(args.get("start"))
    elif report_type in ("weekly", "monthly", "custom"):
        s = _d(args.get("start"))
        e = _d(args.get("end"))
    else:
        s = e = _d(args.get("start"))
    report = build_report(db, s, e)
    report.report_type = report_type
    report.summary = write_summary(report)
    return _json(report.model_dump())


def _create_issue(db: Session, args: dict) -> str:
    issue = Issue(
        reporter_name=args["reporter_name"],
        reporter_role=args.get("reporter_role", ""),
        category=args.get("category", "种植养护"),
        content=args["content"],
    )
    db.add(issue)
    db.commit()
    db.refresh(issue)
    return _json({"id": issue.id, "status": issue.status,
                  "created_at": str(issue.created_at)})


def _list_issues(db: Session, args: dict) -> str:
    q = db.query(Issue)
    if args.get("status"):
        q = q.filter(Issue.status == args["status"])
    if args.get("category"):
        q = q.filter(Issue.category == args["category"])
    rows = q.order_by(Issue.created_at.desc()).limit(50).all()
    return _json([
        {"id": r.id, "reporter_name": r.reporter_name, "reporter_role": r.reporter_role,
         "category": r.category, "content": r.content, "status": r.status,
         "assignee": r.assignee, "reply": r.reply, "created_at": str(r.created_at)}
        for r in rows
    ])


# ---- OpenAI/DeepSeek function 工具定义 ----

TOOLS: list[dict] = [
    {
        "type": "function",
        "function": {
            "name": "get_workers",
            "description": "列出所有工人档案（含时薪）。用于查询工人信息。",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_worklogs",
            "description": "查询某日工时记录。返回该日每人的工时与任务描述。",
            "parameters": {
                "type": "object",
                "properties": {
                    "date": {
                        "type": "string",
                        "description": "日期 YYYY-MM-DD，缺省为今天",
                    },
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_production",
            "description": "查询某段时间的农产品产量记录。",
            "parameters": {
                "type": "object",
                "properties": {
                    "start": {"type": "string", "description": "开始日期 YYYY-MM-DD"},
                    "end": {"type": "string", "description": "结束日期 YYYY-MM-DD"},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "calculate_wages",
            "description": "按日期范围计算工人工资。返回每人工资 + 合计。",
            "parameters": {
                "type": "object",
                "properties": {
                    "start": {"type": "string", "description": "开始日期 YYYY-MM-DD"},
                    "end": {"type": "string", "description": "结束日期 YYYY-MM-DD，缺省取 start"},
                },
                "required": ["start"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "generate_report",
            "description": "生成日/周/月报。返回聚合数据（产量/毛利/工时/工资）+ AI 文字摘要。",
            "parameters": {
                "type": "object",
                "properties": {
                    "report_type": {
                        "type": "string",
                        "enum": ["daily", "weekly", "monthly", "custom"],
                        "description": "报表类型",
                    },
                    "start": {"type": "string", "description": "开始日期 YYYY-MM-DD"},
                    "end": {"type": "string", "description": "结束日期 YYYY-MM-DD"},
                },
                "required": ["report_type"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "create_issue",
            "description": "登记一条问题工单（如果用户上报了种植养护问题）。",
            "parameters": {
                "type": "object",
                "properties": {
                    "reporter_name": {"type": "string", "description": "上报人姓名"},
                    "content": {"type": "string", "description": "问题描述"},
                    "category": {"type": "string", "description": "问题分类，默认 种植养护"},
                    "reporter_role": {"type": "string", "description": "上报人角色（果农/管理层）"},
                },
                "required": ["reporter_name", "content"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_issues",
            "description": "查询问题工单列表，可按状态/分类过滤。",
            "parameters": {
                "type": "object",
                "properties": {
                    "status": {"type": "string", "enum": ["open", "closed"]},
                    "category": {"type": "string"},
                },
            },
        },
    },
]


EXECUTORS: dict[str, Callable[[Session, dict], str]] = {
    "get_workers": _get_workers,
    "get_worklogs": _get_worklogs,
    "get_production": _get_production,
    "calculate_wages": _calculate_wages,
    "generate_report": _generate_report,
    "create_issue": _create_issue,
    "list_issues": _list_issues,
}


SYSTEM_PROMPT = """你是果园运营助理，帮助用户处理日常果园管理工作。

你可以做：
- 查询工人、工时、产量
- 计算工人工资（按工时×时薪）
- 生成日报/周报/月报（产量、毛利、工资、AI 摘要）
- 登记与查询问题工单（果农/管理层上报的种植养护问题）

请用简洁的中文回答；涉及数字时给出结构化要点；遇到模糊时间（"今天"）请用当前日期工具调用。
当前日期：{today}。""".format(today=date.today())

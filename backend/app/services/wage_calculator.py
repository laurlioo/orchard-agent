"""工资计算：按日期范围聚合工时 × 时薪，返回每人 + 合计。"""
from datetime import date
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.work_log import WorkLog
from app.models.worker import Worker
from app.schemas.report import WorkerWageRow


def calc_wages(db: Session, start: date, end: date) -> list[WorkerWageRow]:
    """
    返回 [start, end] 闭区间内每个工人的工资明细。
    rows: list[WorkerWageRow]，hours = sum(hours)，wage = hours * hourly_rate
    """
    rows = (
        db.query(
            Worker.id.label("worker_id"),
            Worker.name,
            Worker.role,
            Worker.hourly_rate,
            func.sum(WorkLog.hours).label("hours"),
        )
        .join(WorkLog, WorkLog.worker_id == Worker.id)
        .filter(WorkLog.date >= start, WorkLog.date <= end)
        .group_by(Worker.id)
        .all()
    )
    return [
        WorkerWageRow(
            worker_id=r.worker_id,
            name=r.name,
            role=r.role or "",
            hours=float(r.hours or 0),
            hourly_rate=float(r.hourly_rate or 0),
            wage=round(float(r.hours or 0) * float(r.hourly_rate or 0), 2),
        )
        for r in rows
    ]


def calc_total_wages(db: Session, start: date, end: date) -> float:
    """返回总工资，方便快速查询。"""
    return round(sum(w.wage for w in calc_wages(db, start, end)), 2)

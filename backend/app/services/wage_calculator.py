"""工资计算：正常工时 × 时薪 + 加班工时 × 时薪 × 加班倍数，分开返回。"""
from datetime import date
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.work_log import WorkLog
from app.models.worker import Worker
from app.schemas.report import WorkerWageRow


def calc_wages(db: Session, start: date, end: date) -> list[WorkerWageRow]:
    """
    返回 [start, end] 闭区间内每个工人的工资明细，拆分正常/加班。
    regular_wage = hours * hourly_rate
    overtime_wage = overtime_hours * hourly_rate * overtime_rate
    wage = regular_wage + overtime_wage
    """
    rows = (
        db.query(
            Worker.id.label("worker_id"),
            Worker.name,
            Worker.role,
            Worker.hourly_rate,
            Worker.overtime_rate,
            func.sum(WorkLog.hours).label("hours"),
            func.sum(WorkLog.overtime_hours).label("overtime_hours"),
        )
        .join(WorkLog, WorkLog.worker_id == Worker.id)
        .filter(WorkLog.date >= start, WorkLog.date <= end)
        .group_by(Worker.id)
        .all()
    )
    result = []
    for r in rows:
        rate = float(r.hourly_rate or 0)
        ot_rate = float(r.overtime_rate or 1.5)
        reg_hours = float(r.hours or 0)
        ot_hours = float(r.overtime_hours or 0)
        reg_wage = round(reg_hours * rate, 2)
        ot_wage = round(ot_hours * rate * ot_rate, 2)
        result.append(
            WorkerWageRow(
                worker_id=r.worker_id,
                name=r.name,
                role=r.role or "",
                hourly_rate=rate,
                overtime_rate=ot_rate,
                hours=reg_hours,
                overtime_hours=ot_hours,
                regular_wage=reg_wage,
                overtime_wage=ot_wage,
                wage=round(reg_wage + ot_wage, 2),
            )
        )
    return result


def calc_total_wages(db: Session, start: date, end: date) -> float:
    """返回总工资。"""
    return round(sum(w.wage for w in calc_wages(db, start, end)), 2)

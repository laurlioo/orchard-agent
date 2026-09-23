"""工资计算：按工时行上的时薪快照计算，缺省回退到工人当前时薪。"""
from datetime import date

from sqlalchemy.orm import Session, joinedload

from app.models.work_log import WorkLog
from app.schemas.report import WorkerWageRow


def calc_wages(db: Session, start: date, end: date) -> list[WorkerWageRow]:
    """
    返回 [start, end] 闭区间内每个工人的工资明细，拆分正常/加班。
    时薪取工时记录快照；旧数据没有快照时回退工人当前时薪。
    """
    logs = (
        db.query(WorkLog)
        .options(joinedload(WorkLog.worker))
        .filter(WorkLog.date >= start, WorkLog.date <= end)
        .order_by(WorkLog.date.asc(), WorkLog.id.asc())
        .all()
    )
    buckets: dict[int, dict] = {}
    for log in logs:
        w = log.worker
        if w is None:
            continue
        rate = float(log.hourly_rate if log.hourly_rate is not None else (w.hourly_rate or 0))
        ot_mult = float(log.overtime_rate if log.overtime_rate is not None else (w.overtime_rate or 1.5))
        reg_hours = float(log.hours or 0)
        ot_hours = float(log.overtime_hours or 0)
        b = buckets.get(w.id)
        if b is None:
            b = {
                "worker_id": w.id,
                "name": w.name,
                "role": w.role or "",
                "hours": 0.0,
                "overtime_hours": 0.0,
                "regular_wage": 0.0,
                "overtime_wage": 0.0,
                "last_rate": rate,
                "last_ot_mult": ot_mult,
            }
            buckets[w.id] = b
        b["hours"] += reg_hours
        b["overtime_hours"] += ot_hours
        b["regular_wage"] += reg_hours * rate
        b["overtime_wage"] += ot_hours * rate * ot_mult
        b["last_rate"] = rate
        b["last_ot_mult"] = ot_mult

    result = []
    for b in buckets.values():
        result.append(
            WorkerWageRow(
                worker_id=b["worker_id"],
                name=b["name"],
                role=b["role"],
                hourly_rate=b["last_rate"],
                overtime_rate=b["last_ot_mult"],
                hours=round(b["hours"], 2),
                overtime_hours=round(b["overtime_hours"], 2),
                regular_wage=round(b["regular_wage"], 2),
                overtime_wage=round(b["overtime_wage"], 2),
                wage=round(b["regular_wage"] + b["overtime_wage"], 2),
            )
        )
    result.sort(key=lambda r: r.worker_id)
    return result


def calc_total_wages(db: Session, start: date, end: date) -> float:
    """返回总工资。"""
    return round(sum(w.wage for w in calc_wages(db, start, end)), 2)

"""工资查询：按日期范围返回每人工资（拆分正常/加班）+ 合计。"""
from datetime import date

from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.report import WorkerWageRow
from app.services.wage_calculator import calc_wages

router = APIRouter(prefix="/wages", tags=["wages"])


class WageSummary(BaseModel):
    period: str
    workers: list[WorkerWageRow]
    total_hours: float
    total_overtime_hours: float
    total_regular_wages: float
    total_overtime_wages: float
    total_wages: float


@router.get("", response_model=WageSummary)
def get_wages(
    request: Request,
    start: date = Query(...),
    end: date = Query(...),
    db: Session = Depends(get_db),
):
    rows = calc_wages(db, start, end)
    if getattr(request.state, "user_role", "") == "worker":
        wid = request.state.user_id
        rows = [r for r in rows if r.worker_id == wid]
    return WageSummary(
        period=f"{start}~{end}",
        workers=rows,
        total_hours=round(sum(w.hours for w in rows), 2),
        total_overtime_hours=round(sum(w.overtime_hours for w in rows), 2),
        total_regular_wages=round(sum(w.regular_wage for w in rows), 2),
        total_overtime_wages=round(sum(w.overtime_wage for w in rows), 2),
        total_wages=round(sum(w.wage for w in rows), 2),
    )

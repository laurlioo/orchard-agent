"""工资查询：按日期范围返回每人工资（拆分正常/加班）+ 合计。"""
from datetime import date
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.report import WorkerWageRow
from app.services.wage_calculator import calc_wages

router = APIRouter(prefix="/wages", tags=["wages"])


class WageSummary(BaseModel):
    period: str
    workers: list[WorkerWageRow]
    total_hours: float  # 正常工时
    total_overtime_hours: float  # 加班工时
    total_regular_wages: float  # 正常工资
    total_overtime_wages: float  # 加班工资
    total_wages: float  # 总工资


@router.get("", response_model=WageSummary)
def get_wages(
    start: date = Query(...),
    end: date = Query(...),
    db: Session = Depends(get_db),
):
    rows = calc_wages(db, start, end)
    return WageSummary(
        period=f"{start}~{end}",
        workers=rows,
        total_hours=round(sum(w.hours for w in rows), 2),
        total_overtime_hours=round(sum(w.overtime_hours for w in rows), 2),
        total_regular_wages=round(sum(w.regular_wage for w in rows), 2),
        total_overtime_wages=round(sum(w.overtime_wage for w in rows), 2),
        total_wages=round(sum(w.wage for w in rows), 2),
    )

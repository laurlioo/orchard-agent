"""工资查询：按日期范围返回每人工资 + 合计。"""
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
    total_hours: float
    total_wages: float


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
        total_wages=round(sum(w.wage for w in rows), 2),
    )

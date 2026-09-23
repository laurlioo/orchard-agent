"""报表生成：聚合数据 + Excel 下载。AI 摘要走独立接口，避免阻塞数字报表。"""
from datetime import date, timedelta
from io import BytesIO

from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_orchard
from app.schemas.report import ReportData
from app.services.report_builder import build_report, export_excel
from app.services.summary_writer import write_summary

router = APIRouter(prefix="/reports", tags=["reports"])


class SummaryOut(BaseModel):
    summary: str


def _resolve_range(report_type: str, start: date | None, end: date | None) -> tuple[date, date]:
    """根据 report_type 推断日期范围，也支持自定义 start/end。"""
    today = date.today()
    if report_type == "daily":
        s = start or today
        return s, s
    if report_type == "weekly":
        s = start or (today - timedelta(days=6))
        e = end or today
        return s, e
    if report_type == "monthly":
        s = start or today.replace(day=1)
        e = end or today
        return s, e
    if not start or not end:
        raise HTTPException(400, "custom 报表必须提供 start 与 end")
    return start, end


@router.get("", response_model=ReportData)
def get_report(
    report_type: str = Query("daily", pattern="^(daily|weekly|monthly|custom)$"),
    start: date | None = Query(None),
    end: date | None = Query(None),
    orchard: str = Depends(get_orchard),
    db: Session = Depends(get_db),
):
    """生成报表数字（不含 AI 摘要）。"""
    s, e = _resolve_range(report_type, start, end)
    report = build_report(db, s, e, orchard=orchard)
    report.report_type = report_type
    return report


@router.get("/summary", response_model=SummaryOut)
def get_report_summary(
    report_type: str = Query("daily", pattern="^(daily|weekly|monthly|custom)$"),
    start: date | None = Query(None),
    end: date | None = Query(None),
    orchard: str = Depends(get_orchard),
    db: Session = Depends(get_db),
):
    """单独生成 AI 摘要，避免拖慢数字报表。"""
    s, e = _resolve_range(report_type, start, end)
    report = build_report(db, s, e, orchard=orchard)
    report.report_type = report_type
    return SummaryOut(summary=write_summary(report))


@router.get("/export")
def export_report(
    report_type: str = Query("daily", pattern="^(daily|weekly|monthly|custom)$"),
    start: date | None = Query(None),
    end: date | None = Query(None),
    with_summary: bool = Query(False),
    orchard: str = Depends(get_orchard),
    db: Session = Depends(get_db),
):
    """下载 .xlsx 报表。默认不含 AI 摘要。"""
    s, e = _resolve_range(report_type, start, end)
    report = build_report(db, s, e, orchard=orchard)
    report.report_type = report_type
    if with_summary:
        report.summary = write_summary(report)
    data = export_excel(report)
    fname = f"orchard_report_{s}_{e}.xlsx"
    return StreamingResponse(
        BytesIO(data),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{fname}"'},
    )

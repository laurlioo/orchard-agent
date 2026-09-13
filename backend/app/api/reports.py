"""报表生成：聚合数据 + Excel 下载 + AI 摘要。"""
from datetime import date, timedelta
from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import StreamingResponse
from io import BytesIO
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.report import ReportData
from app.services.report_builder import build_report, export_excel
from app.services.summary_writer import write_summary

router = APIRouter(prefix="/reports", tags=["reports"])


def _resolve_range(report_type: str, start: date | None, end: date | None) -> tuple[date, date]:
    """根据 report_type 推断日期范围，也支持自定义 start/end。"""
    today = date.today()
    if report_type == "daily":
        s = start or today
        return s, s
    if report_type == "weekly":
        # 默认最近 7 天
        s = start or (today - timedelta(days=6))
        e = end or today
        return s, e
    if report_type == "monthly":
        s = start or today.replace(day=1)
        e = end or today
        return s, e
    # custom 必须传 start/end
    if not start or not end:
        raise HTTPException(400, "custom 报表必须提供 start 与 end")
    return start, end


@router.get("", response_model=ReportData)
def get_report(
    report_type: str = Query("daily", pattern="^(daily|weekly|monthly|custom)$"),
    start: date | None = Query(None),
    end: date | None = Query(None),
    with_summary: bool = Query(True),
    db: Session = Depends(get_db),
):
    """生成报表数据；with_summary=True 时附带 DeepSeek 生成的文字摘要。"""
    s, e = _resolve_range(report_type, start, end)
    report = build_report(db, s, e)
    report.report_type = report_type
    if with_summary:
        report.summary = write_summary(report)
    return report


@router.get("/export")
def export_report(
    report_type: str = Query("daily", pattern="^(daily|weekly|monthly|custom)$"),
    start: date | None = Query(None),
    end: date | None = Query(None),
    with_summary: bool = Query(True),
    db: Session = Depends(get_db),
):
    """下载 .xlsx 报表。"""
    s, e = _resolve_range(report_type, start, end)
    report = build_report(db, s, e)
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

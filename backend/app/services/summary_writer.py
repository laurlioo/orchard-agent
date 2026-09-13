"""调 DeepSeek 生成报表文字摘要。"""
import json
import httpx

from app.core.config import settings
from app.schemas.report import ReportData

SUMMARY_PROMPT = """你是果园运营助理，请基于以下结构化数据用中文写一段 80-150 字的简要日报总结，
覆盖：①总产量/各品类产出亮点；②毛利水平；③工时与工资；④若有零产或亏损品类需提示。
不要罗列数字原文，要给出可读的叙述，结尾给一条运营建议。

数据（JSON）：
{data}
"""


def write_summary(report: ReportData) -> str:
    """调 DeepSeek 生成报表文字摘要，失败时返回兜底文案。"""
    if not settings.DEEPSEEK_API_KEY:
        return _fallback_summary(report)

    payload = {
        "model": settings.DEEPSEEK_MODEL,
        "messages": [
            {"role": "system", "content": "你是果园运营助理，擅长数据摘要。"},
            {
                "role": "user",
                "content": SUMMARY_PROMPT.format(
                    data=report.model_dump_json(indent=2)
                ),
            },
        ],
        "max_tokens": 400,
        "temperature": 0.6,
        "stream": False,
    }
    headers = {
        "Authorization": f"Bearer {settings.DEEPSEEK_API_KEY}",
        "Content-Type": "application/json",
    }
    try:
        with httpx.Client(timeout=60.0) as client:
            r = client.post(
                f"{settings.DEEPSEEK_BASE_URL}/v1/chat/completions",
                json=payload,
                headers=headers,
            )
            r.raise_for_status()
            return r.json()["choices"][0]["message"]["content"].strip()
    except Exception as e:
        return _fallback_summary(report, error=str(e))


def _fallback_summary(report: ReportData, error: str = "") -> str:
    parts = [
        f"{report.period_start} 至 {report.period_end}（{report.report_type}）汇总：",
        f"总产量 {report.total_quantity}，总销售额 {report.total_revenue} 元，"
        f"总毛利 {report.total_gross_profit} 元；",
        f"总工时 {report.total_hours}，总工资 {report.total_wages} 元。",
    ]
    if report.categories:
        top = max(report.categories, key=lambda c: c.gross_profit)
        parts.append(f"毛利最高品类为 {top.name}（{top.gross_profit} 元）。")
    if error:
        parts.append(f"（AI 摘要生成失败：{error}）")
    return "".join(parts)

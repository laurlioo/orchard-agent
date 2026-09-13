"""报表数据 Pydantic 模型。"""
from datetime import date
from pydantic import BaseModel


class CategoryRow(BaseModel):
    """单品类聚合行。"""
    category_id: int
    name: str
    unit: str
    quantity: float
    unit_price: float
    cost_per_unit: float
    revenue: float  # 销售额 = quantity * unit_price
    cost: float  # 成本 = quantity * cost_per_unit
    gross_profit: float  # 毛利 = revenue - cost


class WorkerWageRow(BaseModel):
    """单工人工资行。"""
    worker_id: int
    name: str
    role: str
    hours: float
    hourly_rate: float
    wage: float  # hours * hourly_rate


class ReportData(BaseModel):
    """日/周/月报聚合数据。"""
    period_start: date
    period_end: date
    report_type: str  # daily/weekly/monthly
    categories: list[CategoryRow]
    workers: list[WorkerWageRow]
    total_quantity: float
    total_revenue: float
    total_cost: float
    total_gross_profit: float
    total_hours: float
    total_wages: float
    summary: str = ""  # AI 生成的文字摘要

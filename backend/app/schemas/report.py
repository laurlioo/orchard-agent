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
    """单工人工资行（拆分正常/加班）。"""
    worker_id: int
    name: str
    role: str
    hourly_rate: float
    overtime_rate: float  # 加班倍数
    hours: float  # 正常工时
    overtime_hours: float  # 加班工时
    regular_wage: float  # 正常工时工资 = hours * hourly_rate
    overtime_wage: float  # 加班工资 = overtime_hours * hourly_rate * overtime_rate
    wage: float  # 总工资 = regular_wage + overtime_wage


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
    total_overtime_hours: float
    total_regular_wages: float
    total_overtime_wages: float
    total_wages: float
    summary: str = ""  # AI 生成的文字摘要

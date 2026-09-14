"""工时记录：正常工时 + 加班工时分开记录，工资分开计算。"""
from sqlalchemy import Column, Integer, String, Float, Date, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship

from app.core.database import Base


class WorkLog(Base):
    __tablename__ = "work_logs"

    id = Column(Integer, primary_key=True, index=True)
    worker_id = Column(Integer, ForeignKey("workers.id"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    hours = Column(Float, nullable=False, default=0)  # 正常工时（小时）
    overtime_hours = Column(Float, default=0)  # 加班工时（小时）
    task_desc = Column(String(200), default="")  # 任务描述
    created_at = Column(DateTime, server_default=func.now())

    worker = relationship("Worker")

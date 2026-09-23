"""工人模型：name/phone/role/hourly_rate/overtime_rate/active。"""
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, func

from app.core.database import Base


class Worker(Base):
    __tablename__ = "workers"

    id = Column(Integer, primary_key=True, index=True)
    orchard = Column(String(20), nullable=False, default="peach", index=True)  # peach/grape
    name = Column(String(50), nullable=False, index=True)
    phone = Column(String(20), default="")
    role = Column(String(50), default="工人")  # 采摘/分拣/养护/管理
    hourly_rate = Column(Float, default=0.0)  # 时薪（元/小时）
    overtime_rate = Column(Float, default=1.5)  # 加班倍数，如 1.5 倍、2 倍
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())

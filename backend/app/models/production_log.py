"""产量记录：category_id + 日期 + 数量 + 备注。"""
from sqlalchemy import Column, Integer, String, Float, Date, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship

from app.core.database import Base


class ProductionLog(Base):
    __tablename__ = "production_logs"

    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(Integer, ForeignKey("product_categories.id"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    quantity = Column(Float, nullable=False)  # 数量
    notes = Column(String(200), default="")
    created_at = Column(DateTime, server_default=func.now())

    category = relationship("ProductCategory")

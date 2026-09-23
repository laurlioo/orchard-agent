"""产量记录：category_id + 日期 + 数量 + 备注。"""
from sqlalchemy import Column, Integer, String, Float, Date, DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.orm import relationship

from app.core.database import Base


class ProductionLog(Base):
    __tablename__ = "production_logs"
    __table_args__ = (
        UniqueConstraint("category_id", "date", name="uq_production_logs_cat_date"),
    )

    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(Integer, ForeignKey("product_categories.id"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    quantity = Column(Float, nullable=False)  # 数量
    unit_price = Column(Float, nullable=True)  # 当日售价快照；为空则回退品类售价
    notes = Column(String(200), default="")
    created_at = Column(DateTime, server_default=func.now())

    category = relationship("ProductCategory")

"""农产品品类：name/unit/unit_price/cost_per_unit。"""
from sqlalchemy import Column, Integer, String, Float, DateTime, func

from app.core.database import Base


class ProductCategory(Base):
    __tablename__ = "product_categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), nullable=False, index=True)  # 苹果/梨/桃...
    unit = Column(String(10), default="斤")  # 计量单位
    unit_price = Column(Float, default=0.0)  # 售价（元/单位）
    cost_per_unit = Column(Float, default=0.0)  # 成本（元/单位）
    created_at = Column(DateTime, server_default=func.now())

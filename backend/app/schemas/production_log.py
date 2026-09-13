"""产量记录 Pydantic 模型。"""
from datetime import date, datetime
from pydantic import BaseModel, Field

from app.schemas.product import ProductOut


class ProductionLogBase(BaseModel):
    category_id: int
    date: date
    quantity: float = Field(..., gt=0)
    notes: str = Field("", max_length=200)


class ProductionLogCreate(ProductionLogBase):
    pass


class ProductionLogUpdate(BaseModel):
    quantity: float | None = None
    notes: str | None = None


class ProductionLogOut(ProductionLogBase):
    id: int
    created_at: datetime
    category: ProductOut | None = None

    class Config:
        from_attributes = True

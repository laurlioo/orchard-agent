"""农产品品类 Pydantic 模型。"""
from datetime import datetime
from pydantic import BaseModel, Field


class ProductBase(BaseModel):
    name: str = Field(..., max_length=50)
    unit: str = Field("斤", max_length=10)
    unit_price: float = Field(0.0, ge=0)
    cost_per_unit: float = Field(0.0, ge=0)


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: str | None = None
    unit: str | None = None
    unit_price: float | None = None
    cost_per_unit: float | None = None


class ProductOut(ProductBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

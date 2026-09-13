"""工人 Pydantic 模型。"""
from datetime import datetime
from pydantic import BaseModel, Field


class WorkerBase(BaseModel):
    name: str = Field(..., max_length=50)
    phone: str = Field("", max_length=20)
    role: str = Field("工人", max_length=50)
    hourly_rate: float = Field(0.0, ge=0)
    active: bool = True


class WorkerCreate(WorkerBase):
    pass


class WorkerUpdate(BaseModel):
    name: str | None = None
    phone: str | None = None
    role: str | None = None
    hourly_rate: float | None = None
    active: bool | None = None


class WorkerOut(WorkerBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

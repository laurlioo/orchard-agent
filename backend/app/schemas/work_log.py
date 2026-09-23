"""工时记录 Pydantic 模型。"""
from datetime import date, datetime
from pydantic import BaseModel, Field, model_validator

from app.schemas.worker import WorkerOut


class WorkLogBase(BaseModel):
    worker_id: int
    date: date
    hours: float = Field(0, ge=0, le=24)
    overtime_hours: float = Field(0, ge=0, le=24)
    task_desc: str = Field("", max_length=200)


class WorkLogCreate(WorkLogBase):
    @model_validator(mode="after")
    def hours_not_all_zero(self):
        if (self.hours or 0) + (self.overtime_hours or 0) <= 0:
            raise ValueError("正常工时和加班工时不能都为 0")
        if (self.hours or 0) + (self.overtime_hours or 0) > 24:
            raise ValueError("正常工时和加班工时合计不能超过 24 小时")
        return self


class WorkLogUpdate(BaseModel):
    hours: float | None = Field(None, ge=0, le=24)
    overtime_hours: float | None = Field(None, ge=0, le=24)
    task_desc: str | None = None


class WorkLogOut(WorkLogBase):
    id: int
    created_at: datetime
    hourly_rate: float | None = None
    overtime_rate: float | None = None
    worker: WorkerOut | None = None

    class Config:
        from_attributes = True

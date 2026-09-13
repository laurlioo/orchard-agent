"""工时记录 Pydantic 模型。"""
from datetime import date, datetime
from pydantic import BaseModel, Field

from app.schemas.worker import WorkerOut


class WorkLogBase(BaseModel):
    worker_id: int
    date: date
    hours: float = Field(..., gt=0)
    task_desc: str = Field("", max_length=200)


class WorkLogCreate(WorkLogBase):
    pass


class WorkLogUpdate(BaseModel):
    hours: float | None = None
    task_desc: str | None = None


class WorkLogOut(WorkLogBase):
    id: int
    created_at: datetime
    worker: WorkerOut | None = None

    class Config:
        from_attributes = True

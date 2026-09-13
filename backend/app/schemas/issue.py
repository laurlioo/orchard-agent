"""问题工单 Pydantic 模型。"""
from datetime import datetime
from pydantic import BaseModel, Field


class IssueBase(BaseModel):
    reporter_name: str = Field(..., max_length=50)
    reporter_role: str = Field("", max_length=50)
    category: str = Field("种植养护", max_length=50)
    content: str


class IssueCreate(IssueBase):
    pass


class IssueUpdate(BaseModel):
    status: str | None = None
    assignee: str | None = None
    reply: str | None = None


class IssueOut(IssueBase):
    id: int
    status: str
    assignee: str
    reply: str
    created_at: datetime

    class Config:
        from_attributes = True

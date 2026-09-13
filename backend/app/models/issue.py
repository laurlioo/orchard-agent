"""问题工单：reporter/category/content/status/reply。"""
from sqlalchemy import Column, Integer, String, Text, DateTime, func

from app.core.database import Base


class Issue(Base):
    __tablename__ = "issues"

    id = Column(Integer, primary_key=True, index=True)
    reporter_name = Column(String(50), nullable=False)  # 上报人姓名
    reporter_role = Column(String(50), default="")  # 果农/管理层
    category = Column(String(50), default="种植养护")  # 问题分类
    content = Column(Text, nullable=False)  # 问题描述
    status = Column(String(20), default="open")  # open/closed
    assignee = Column(String(50), default="")  # 处理人
    reply = Column(Text, default="")  # 回复
    created_at = Column(DateTime, server_default=func.now())
    resolved_at = Column(DateTime, nullable=True)

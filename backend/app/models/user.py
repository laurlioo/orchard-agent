"""用户模型：username/password_hash/role。"""
from sqlalchemy import Column, Integer, String, DateTime, func

from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), nullable=False, unique=True, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), default="viewer")  # admin / viewer
    created_at = Column(DateTime, server_default=func.now())

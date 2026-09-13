"""SQLite 连接与 Session 管理。"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from app.core.config import settings

# check_same_thread=False 让 FastAPI 多线程也能用同一个连接
engine = create_engine(
    f"sqlite:///{settings.DB_PATH}",
    connect_args={"check_same_thread": False},
    echo=False,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """FastAPI 依赖注入：每个请求一个 session，请求结束自动关闭。"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """建表：导入所有模型后调用 create_all。"""
    # noqa: F401  确保模型被注册到 Base.metadata
    from app.models import worker, work_log, product, production_log, issue  # noqa
    Base.metadata.create_all(bind=engine)

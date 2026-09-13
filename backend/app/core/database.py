"""SQLite 连接与 Session 管理。支持本地 SQLite 与 Turso 托管 SQLite。"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from app.core.config import settings

db_url = settings.sqlalchemy_url
# 判断是否走 libsql（Turso）驱动
_is_libsql = db_url.startswith("sqlite+libsql://")

if _is_libsql:
    # Turso 远端：不传 check_same_thread，libsql 客户端自己管连接
    engine = create_engine(db_url, echo=False)
else:
    # 本地 SQLite：check_same_thread=False 让 FastAPI 多线程共用连接
    engine = create_engine(
        db_url,
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

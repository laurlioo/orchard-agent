"""应用配置：从 .env 读取 DeepSeek API key、模型名、数据库路径。"""
import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    DEEPSEEK_API_KEY: str = os.getenv("DEEPSEEK_API_KEY", "")
    DEEPSEEK_BASE_URL: str = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com")
    DEEPSEEK_MODEL: str = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")
    # 优先用 Turso 托管 SQLite；若未配置则回退本地 SQLite
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    DB_PATH: str = os.getenv("DB_PATH", "./orchard.db")

    @property
    def sqlalchemy_url(self) -> str:
        """返回 SQLAlchemy 可用的连接 URL。"""
        if self.DATABASE_URL:
            # Turso: libsql://host?authToken=xxx → sqlalchemy 用 sqlite+libsql 驱动
            url = self.DATABASE_URL
            # 已带 scheme 直接转，否则补 scheme
            if url.startswith("libsql://"):
                # sqlalchemy-libsql 期望格式: sqlite+libsql://host?authToken=xxx
                return url.replace("libsql://", "sqlite+libsql://", 1)
            if url.startswith("sqlite+libsql://"):
                return url
            if url.startswith("sqlite://"):
                return url
            # 兜底：当作本地路径
            return f"sqlite:///{url}"
        # 本地回退
        return f"sqlite:///{self.DB_PATH}"


settings = Settings()

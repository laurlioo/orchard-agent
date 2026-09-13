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
            url = self.DATABASE_URL
            # Turso 新版 API 需要 HTTPS 端点，libsql:// 会触发 308 重定向
            if url.startswith("libsql://"):
                # sqlite+libsql-https:// 强制走 HTTPS，避免 308
                return url.replace("libsql://", "sqlite+libsql-https://", 1)
            if url.startswith("sqlite+libsql://"):
                # 已有 libsql scheme 但不是 HTTPS，也转成 HTTPS
                return url.replace("sqlite+libsql://", "sqlite+libsql-https://", 1)
            if url.startswith("sqlite+libsql-https://"):
                return url
            if url.startswith("https://"):
                # 直接 https:// 开头，补 sqlite+libsql-https scheme
                return url.replace("https://", "sqlite+libsql-https://", 1)
            if url.startswith("sqlite://"):
                return url
            return f"sqlite:///{url}"
        # 本地回退
        return f"sqlite:///{self.DB_PATH}"


settings = Settings()

"""应用配置：从 .env 读取 DeepSeek API key、模型名、数据库路径。"""
import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    DEEPSEEK_API_KEY: str = os.getenv("DEEPSEEK_API_KEY", "")
    DEEPSEEK_BASE_URL: str = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com")
    DEEPSEEK_MODEL: str = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")
    # Turso 数据库 URL（不含 authToken，单独存在 DATABASE_AUTH_TOKEN）
    # 格式: libsql://orchard-xxx.turso.io
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    # Turso auth token（可选，仅 Turso 模式需要）
    DATABASE_AUTH_TOKEN: str = os.getenv("DATABASE_AUTH_TOKEN", "")
    DB_PATH: str = os.getenv("DB_PATH", "./orchard.db")

    @property
    def is_turso(self) -> bool:
        """是否使用 Turso 托管数据库。"""
        return bool(self.DATABASE_URL and self.DATABASE_URL.startswith("libsql://"))

    @property
    def sqlalchemy_url(self) -> str:
        """返回 SQLAlchemy 可用的连接 URL。"""
        if self.is_turso:
            # Turso 官方推荐: sqlite+libsql://host?secure=true
            # secure=true 强制 HTTPS，避免 308 重定向
            host = self.DATABASE_URL.replace("libsql://", "", 1)
            return f"sqlite+libsql://{host}?secure=true"
        if self.DATABASE_URL and self.DATABASE_URL.startswith("sqlite://"):
            return self.DATABASE_URL
        # 本地 SQLite 回退
        return f"sqlite:///{self.DB_PATH}"

    @property
    def connect_args(self) -> dict:
        """SQLAlchemy create_engine 的 connect_args。"""
        if self.is_turso:
            # Turso: auth_token 通过 connect_args 传入，secure 已在 URL query 里
            args = {}
            if self.DATABASE_AUTH_TOKEN:
                args["auth_token"] = self.DATABASE_AUTH_TOKEN
            return args
        # 本地 SQLite
        return {"check_same_thread": False}


settings = Settings()

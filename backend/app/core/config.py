"""应用配置：从 .env 读取 DeepSeek API key、模型名、数据库路径。"""
import os
from dotenv import load_dotenv

load_dotenv()

DEFAULT_JWT_SECRET = "orchard-agent-secret-change-me-in-prod"


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
    # development | production；Render 会自动设置 RENDER=true
    APP_ENV: str = os.getenv("APP_ENV", "development")
    ENABLE_DOCS: str = os.getenv("ENABLE_DOCS", "")
    JWT_SECRET: str = os.getenv("JWT_SECRET", DEFAULT_JWT_SECRET)
    # 生产环境首次初始化管理员时需要的密钥；留空表示不校验（仅建议开发环境）
    SETUP_TOKEN: str = os.getenv("SETUP_TOKEN", "")

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

    @property
    def is_production(self) -> bool:
        if self.APP_ENV.lower() == "production":
            return True
        return os.getenv("RENDER", "").lower() in ("true", "1")

    @property
    def docs_enabled(self) -> bool:
        flag = self.ENABLE_DOCS.lower()
        if flag in ("1", "true", "yes"):
            return True
        if flag in ("0", "false", "no"):
            return False
        return not self.is_production

    @property
    def setup_requires_token(self) -> bool:
        """是否需要在初始化管理员时校验 setup_token。"""
        return bool(self.SETUP_TOKEN)

    def assert_secure(self) -> None:
        """生产环境拒绝默认 JWT 密钥，并强制要求 SETUP_TOKEN。"""
        if not self.is_production:
            return
        raw = os.getenv("JWT_SECRET", "")
        if not raw or raw == DEFAULT_JWT_SECRET:
            raise RuntimeError("生产环境必须设置 JWT_SECRET，且不能使用默认值")
        setup_token = os.getenv("SETUP_TOKEN", "")
        if not setup_token or setup_token == "change-me":
            raise RuntimeError("生产环境必须设置 SETUP_TOKEN（首次初始化管理员所需的密钥）")


settings = Settings()

"""应用配置：从 .env 读取 DeepSeek API key、模型名、数据库路径。"""
import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    DEEPSEEK_API_KEY: str = os.getenv("DEEPSEEK_API_KEY", "")
    DEEPSEEK_BASE_URL: str = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com")
    DEEPSEEK_MODEL: str = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")
    DB_PATH: str = os.getenv("DB_PATH", "./orchard.db")


settings = Settings()

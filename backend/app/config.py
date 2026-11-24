"""Application configuration using Pydantic Settings."""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime settings for Orqestra AI backend."""

    app_name: str = "Orqestra AI"
    app_version: str = "1.0.0"
    database_url: str = "sqlite:///./orqestra.db"
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"
    default_sla_hours: float = 120.0  # 5 days fallback when no explicit deadline exists
    max_upload_rows: int = 100_000

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()

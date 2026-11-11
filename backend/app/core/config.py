"""Application configuration management using pydantic-settings."""

from __future__ import annotations

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Centralized environment settings for the PhishGuard AI backend."""

    APP_NAME: str = "PhishGuard AI API"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"

    # Supports PostgreSQL (Render/Local) or local SQLite file for zero-config Windows 11 startup
    DATABASE_URL: str = "sqlite:///./phishguard.db"

    # Comma-separated list of allowed frontend origins
    CORS_ORIGINS: str = (
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000"
    )

    MODEL_VERSION: str = "v1"
    RATE_LIMIT_PER_MINUTE: int = 30

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def normalize_database_url(cls, value: str) -> str:
        """Convert Render/Heroku postgres:// URLs to SQLAlchemy psycopg v3 driver syntax."""
        if not isinstance(value, str) or not value.strip():
            return "sqlite:///./phishguard.db"
        cleaned = value.strip()
        if cleaned.startswith("postgres://"):
            return cleaned.replace("postgres://", "postgresql+psycopg://", 1)
        if cleaned.startswith("postgresql://") and "+psycopg" not in cleaned:
            return cleaned.replace("postgresql://", "postgresql+psycopg://", 1)
        return cleaned

    @property
    def cors_origin_list(self) -> list[str]:
        return [
            origin.strip()
            for origin in self.CORS_ORIGINS.split(",")
            if origin.strip()
        ]


settings = Settings()

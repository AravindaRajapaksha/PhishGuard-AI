"""Application configuration management using pydantic-settings."""

from __future__ import annotations

import os

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


def _is_serverless() -> bool:
    return bool(os.getenv("VERCEL") or os.getenv("AWS_LAMBDA_FUNCTION_NAME"))


class Settings(BaseSettings):
    """Centralized environment settings for the PhishGuard AI backend."""

    APP_NAME: str = "PhishGuard AI API"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"

    # Supports PostgreSQL (Render/Neon/Local) or local SQLite file
    DATABASE_URL: str = Field(
        default="sqlite:///./phishguard.db",
        validate_default=True,
    )

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
        """Convert Render/Heroku postgres:// URLs and handle Vercel /tmp SQLite fallback."""
        default_sqlite = (
            "sqlite:////tmp/phishguard.db"
            if _is_serverless()
            else "sqlite:///./phishguard.db"
        )
        if not isinstance(value, str) or not value.strip():
            return default_sqlite
        cleaned = value.strip()
        if cleaned == "sqlite:///./phishguard.db" and _is_serverless():
            return "sqlite:////tmp/phishguard.db"
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

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    project_name: str = Field(
        default="Meraki - The boutique API",
        validation_alias="PROJECT_NAME",
    )
    upload_dir: str = Field(default="uploads", validation_alias="UPLOAD_DIR")
    database_url: str = Field(
        default="sqlite:///./boutique.db",
        validation_alias="DATABASE_URL",
    )
    max_upload_size: int = Field(
        default=100 * 1024 * 1024,
        validation_alias="MAX_UPLOAD_SIZE",
        description="Max bytes for image uploads.",
    )
    cors_origins: list[str] = Field(
        default_factory=lambda: [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:3001",
        ],
        validation_alias="CORS_ORIGINS",
    )
    backend_public_url: str = Field(
        default="http://127.0.0.1:8000",
        validation_alias="BACKEND_PUBLIC_URL",
    )

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    """Return cached application settings."""
    return Settings()


settings: Settings = get_settings()

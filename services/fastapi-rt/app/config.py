# @author Bodo Desderio <rooiboktechltd@gmail.com>
# @copyright 2026 Rooibok Technologies. All rights reserved.
"""
Settings for the FastAPI realtime tier.

pydantic-settings validates required values at instantiation, so a missing
DATABASE_URL/REDIS_URL fails fast at boot (SEC-5) rather than at first request.
"""
from __future__ import annotations

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = Field(..., alias="DATABASE_URL")
    redis_url: str = Field(..., alias="REDIS_URL")
    # Shared with Django (schema is owned there); FastAPI verifies JWTs it did not mint.
    jwt_signing_key: str = Field(..., alias="DJANGO_SECRET_KEY")
    log_level: str = Field("INFO", alias="LOG_LEVEL")

    @property
    def sqlalchemy_url(self) -> str:
        url = self.database_url
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql://", 1)
        if url.startswith("postgresql://"):
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return url


settings = Settings()  # raises at import time if required env is missing

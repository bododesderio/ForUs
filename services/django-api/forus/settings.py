# @author Bodo Desderio <rooiboktechltd@gmail.com>
# @copyright 2026 Rooibok Technologies. All rights reserved.
"""
Django settings for the ForUs data/admin/auth/CRUD API.

Configuration is environment-driven. Required secrets are validated at import time
(SEC-5): the process refuses to boot if a required variable is unset in a non-DEBUG
environment. No secret carries an insecure production default.
"""
from __future__ import annotations

import os
from pathlib import Path

from django.core.exceptions import ImproperlyConfigured

BASE_DIR = Path(__file__).resolve().parent.parent


def env(key: str, default: str | None = None, *, required: bool = False) -> str | None:
    value = os.environ.get(key, default)
    if required and not value:
        raise ImproperlyConfigured(f"Required environment variable {key!r} is not set")
    return value


def env_bool(key: str, default: bool = False) -> bool:
    return (os.environ.get(key, str(default)).strip().lower()) in {"1", "true", "yes", "on"}


def env_list(key: str, default: str = "") -> list[str]:
    return [item.strip() for item in os.environ.get(key, default).split(",") if item.strip()]


DEBUG = env_bool("DEBUG", default=False)

# In DEBUG we allow a throwaway key so `manage.py` works locally without secrets.
# In production the variable is required — boot fails fast if it is missing.
SECRET_KEY = env("DJANGO_SECRET_KEY", default="dev-insecure-key" if DEBUG else None, required=not DEBUG)

ALLOWED_HOSTS = env_list("ALLOWED_HOSTS", default="localhost,127.0.0.1" if DEBUG else "")

# ─── Applications ─────────────────────────────────────────────────────────────
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "rest_framework_simplejwt.token_blacklist",  # replaces the source `refresh_tokens` table
    "corsheaders",
    "core",
    # ─── Domain apps (Django owns the schema — ARCH-1) ──────────────────────────
    "accounts",
    "appointments",
    "wellness",
    "content",
    "chat",
    "community",
]

# Custom identity model — email login, role-based, UUID PK. Must be set before the
# first migration; changing it afterwards is effectively irreversible.
AUTH_USER_MODEL = "accounts.User"

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "forus.urls"
WSGI_APPLICATION = "forus.wsgi.application"
ASGI_APPLICATION = "forus.asgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

# ─── Database (PostgreSQL, single source of schema truth via Django migrations) ─
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": env("DB_NAME", default="forus" if DEBUG else None, required=not DEBUG),
        "USER": env("DB_USER", default="forus" if DEBUG else None, required=not DEBUG),
        "PASSWORD": env("DB_PASSWORD", default="forus" if DEBUG else None, required=not DEBUG),
        "HOST": env("DB_HOST", default="localhost"),
        "PORT": env("DB_PORT", default="5432"),
        "CONN_MAX_AGE": int(env("DB_CONN_MAX_AGE", default="60")),
    }
}

# bcryptjs hashes from the Node backend are plain bcrypt ($2a/$2b). BCryptPasswordHasher
# (NOT BCryptSHA256, which pre-hashes with SHA256 and cannot read them) verifies those, so
# new passwords are stored bcrypt too. A future Node→Python user copy prefixes each bare
# `$2b$…` hash with `bcrypt$` (Django's algorithm marker) so `check_password` recognizes it.
PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.BCryptPasswordHasher",
    "django.contrib.auth.hashers.PBKDF2PasswordHasher",
    "django.contrib.auth.hashers.Argon2PasswordHasher",
]

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
]

# ─── Cache / Redis (broker, cache, rate-limit, WS pub-sub coordination) ─────────
REDIS_URL = env("REDIS_URL", default="redis://localhost:6379/0")
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": REDIS_URL,
    }
}

# ─── Celery ─────────────────────────────────────────────────────────────────────
CELERY_BROKER_URL = env("CELERY_BROKER_URL", default=REDIS_URL)
CELERY_RESULT_BACKEND = env("CELERY_RESULT_BACKEND", default=REDIS_URL)
CELERY_TASK_ALWAYS_EAGER = env_bool("CELERY_TASK_ALWAYS_EAGER", default=False)
CELERY_TIMEZONE = "UTC"

from celery.schedules import crontab  # noqa: E402

CELERY_BEAT_SCHEDULE = {
    "appointment-reminders": {
        "task": "appointments.tasks.send_appointment_reminders",
        "schedule": crontab(minute="*/5"),
    },
    "auto-cancel-expired-appointments": {
        "task": "appointments.tasks.cancel_expired_appointments",
        "schedule": crontab(minute="*/5"),
    },
}

# ─── DRF + SimpleJWT (auth ported in R2; rotation + blacklist per SEC-3) ─────────
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_THROTTLE_RATES": {"anon": "60/min", "user": "200/min"},
    "EXCEPTION_HANDLER": "core.exceptions.exception_handler",
}

from datetime import timedelta  # noqa: E402

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=15),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
}

# ─── CORS ───────────────────────────────────────────────────────────────────────
CORS_ALLOWED_ORIGINS = env_list("ALLOWED_ORIGINS")
CORS_ALLOW_ALL_ORIGINS = DEBUG and not CORS_ALLOWED_ORIGINS

# ─── Media storage → Cloudflare R2 (S3-compatible), wired fully in R5 ────────────
STORAGES = {
    "default": {
        "BACKEND": "storages.backends.s3.S3Storage",
        "OPTIONS": {
            "bucket_name": env("R2_BUCKET", default="forus-uploads"),
            "endpoint_url": env("R2_ENDPOINT"),
            "access_key": env("R2_ACCESS_KEY_ID"),
            "secret_key": env("R2_SECRET_ACCESS_KEY"),
            "region_name": "auto",
            "signature_version": "s3v4",
            "querystring_auth": False,
        },
    },
    "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
}

# Public base for served objects (R2 custom domain or pub-*.r2.dev). Uploads return
# `${R2_PUBLIC_URL}/${key}`; unset (dev) falls back to the storage backend's URL.
R2_PUBLIC_URL = env("R2_PUBLIC_URL", default="")
# Hard cap enforced before an upload is streamed to storage (SEC-6).
MAX_UPLOAD_BYTES = int(env("MAX_UPLOAD_BYTES", default=str(50 * 1024 * 1024)))

# ─── i18n / static ──────────────────────────────────────────────────────────────
LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True
STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ─── Security headers (hardened in production) ──────────────────────────────────
if not DEBUG:
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True

# ─── Structured logging (structlog; no console.log-style leakage, SEC-7) ────────
# ProcessorFormatter needs a real processor callable and a foreign_pre_chain so
# plain-stdlib records (Django's own) render as JSON too — passing dotted-path
# strings here silently breaks formatting.
import structlog  # noqa: E402

_LOG_FOREIGN_PRE_CHAIN = [
    structlog.contextvars.merge_contextvars,
    structlog.processors.add_log_level,
    structlog.processors.TimeStamper(fmt="iso"),
]

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "json": {
            "()": "structlog.stdlib.ProcessorFormatter",
            "processor": structlog.processors.JSONRenderer(),
            "foreign_pre_chain": _LOG_FOREIGN_PRE_CHAIN,
        },
    },
    "handlers": {
        "console": {"class": "logging.StreamHandler", "formatter": "json"},
    },
    "root": {"handlers": ["console"], "level": env("LOG_LEVEL", default="INFO")},
}

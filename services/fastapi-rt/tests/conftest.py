# @author Bodo Desderio <rooiboktechltd@gmail.com>
# @copyright 2026 Rooibok Technologies. All rights reserved.
import os

# Provide hermetic defaults so the app imports without real infrastructure.
# Health will report "degraded" if the services are down — the smoke test tolerates that.
os.environ.setdefault("DATABASE_URL", "postgresql://forus:forus@localhost:5432/forus")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/0")
os.environ.setdefault("DJANGO_SECRET_KEY", "test-signing-key")

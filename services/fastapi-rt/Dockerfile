# @author Bodo Desderio <rooiboktechltd@gmail.com>
# @copyright 2026 Rooibok Technologies. All rights reserved.
# Build context is the repo root so the image can include the shared `libs/` tree
# (Django owns the schema; FastAPI reflects it via libs.db — ARCH-1).
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

COPY services/fastapi-rt/pyproject.toml ./
RUN pip install --upgrade pip && pip install .

COPY services/fastapi-rt/ ./
COPY libs/ ./libs/

EXPOSE 8000

# Gateway maps host 10002 → 8000.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

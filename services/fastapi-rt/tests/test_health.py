# @author Bodo Desderio <rooiboktechltd@gmail.com>
# @copyright 2026 Rooibok Technologies. All rights reserved.
from fastapi.testclient import TestClient

from app.main import app


def test_health_endpoint_shape():
    with TestClient(app) as client:
        resp = client.get("/rt/health")
    assert resp.status_code in (200, 503)
    body = resp.json()
    assert body["service"] == "fastapi-rt"
    assert {"status", "database", "redis"}.issubset(body)

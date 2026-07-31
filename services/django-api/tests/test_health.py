# @author Bodo Desderio <rooiboktechltd@gmail.com>
# @copyright 2026 Rooibok Technologies. All rights reserved.
import pytest
from django.urls import reverse


def test_health_url_resolves():
    # Boot/route smoke test — a dangling route (BUG-1 class) fails here.
    assert reverse("health") == "/api/health"


@pytest.mark.django_db
def test_health_endpoint_shape(client):
    resp = client.get("/api/health")
    assert resp.status_code in (200, 503)
    body = resp.json()
    assert body["service"] == "django-api"
    assert {"status", "database", "redis"}.issubset(body)

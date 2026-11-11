"""Comprehensive integration tests for all FastAPI endpoints, database persistence, and security."""

from __future__ import annotations

from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import settings
from app.core.security import scan_rate_limiter
from app.database.connection import get_db
from app.database.models import Base
from app.main import app

TEST_SQLITE_URL = "sqlite://"

test_engine = create_engine(
    TEST_SQLITE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(
    autocommit=False, autoflush=False, bind=test_engine
)


@pytest.fixture(autouse=True)
def setup_test_db() -> Generator[None, None, None]:
    Base.metadata.create_all(bind=test_engine)
    scan_rate_limiter.reset()
    yield
    Base.metadata.drop_all(bind=test_engine)
    scan_rate_limiter.reset()


def override_get_db() -> Generator[Session, None, None]:
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


def test_health_endpoint_and_security_headers() -> None:
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["model_loaded"] is True
    assert data["database_connected"] is True
    assert data["model_version"] == "v1.0.0"
    assert response.headers.get("X-Content-Type-Options") == "nosniff"
    assert response.headers.get("X-Frame-Options") == "DENY"


def test_analytics_overview_empty_database_state() -> None:
    response = client.get("/api/v1/analytics/overview")
    assert response.status_code == 200
    data = response.json()
    assert data["total_scans"] == 0
    assert data["phishing_count"] == 0
    assert data["legitimate_count"] == 0
    assert data["suspicious_count"] == 0
    assert data["recent_scans"] == []
    assert data["scans_over_time"] == []
    assert data["model_summary"]["version"] == "v1.0.0"
    assert data["model_summary"]["accuracy"] > 0.85


def test_scan_url_and_privacy_redaction_and_history_lifecycle() -> None:
    # 1. Scan a legitimate URL
    legit_resp = client.post(
        "/api/v1/scan",
        json={"url": "https://www.wikipedia.org/wiki/Machine_learning"},
    )
    assert legit_resp.status_code == 200
    legit_data = legit_resp.json()
    assert legit_data["prediction"] == "legitimate"
    assert legit_data["risk_level"] == "low"
    assert len(legit_data["feature_details"]) == 24
    assert "cannot guarantee" in legit_data["disclaimer"]

    # 2. Scan a phishing URL containing sensitive query parameters
    phish_resp = client.post(
        "/api/v1/scan",
        json={
            "url": "http://secure-login.paypal.com.account-verify.xyz/signin?token=super_secret_jwt&email=user@corp.com"
        },
    )
    assert phish_resp.status_code == 200
    phish_data = phish_resp.json()
    assert phish_data["prediction"] == "phishing"
    assert phish_data["risk_level"] == "high"
    assert "super_secret_jwt" not in phish_data["redacted_url"]
    assert "user@corp.com" not in phish_data["redacted_url"]
    assert "token=[REDACTED]" in phish_data["redacted_url"]
    assert "email=[REDACTED]" in phish_data["redacted_url"]

    phish_id = phish_data["id"]

    # 3. Verify history listing and filtering
    hist_resp = client.get("/api/v1/history")
    assert hist_resp.status_code == 200
    hist_data = hist_resp.json()
    assert hist_data["total"] == 2
    assert len(hist_data["items"]) == 2

    filtered_resp = client.get(
        "/api/v1/history", params={"prediction": "phishing", "search": "paypal"}
    )
    assert filtered_resp.status_code == 200
    filtered_data = filtered_resp.json()
    assert filtered_data["total"] == 1
    assert filtered_data["items"][0]["id"] == phish_id

    # 4. Verify single scan detail retrieval
    detail_resp = client.get(f"/api/v1/history/{phish_id}")
    assert detail_resp.status_code == 200
    detail_data = detail_resp.json()
    assert detail_data["id"] == phish_id
    assert detail_data["extracted_features"]["suspicious_keyword_count"] >= 3

    # 5. Verify analytics overview with populated database
    analytics_resp = client.get("/api/v1/analytics/overview")
    assert analytics_resp.status_code == 200
    analytics_data = analytics_resp.json()
    assert analytics_data["total_scans"] == 2
    assert analytics_data["phishing_count"] == 1
    assert analytics_data["legitimate_count"] == 1
    assert len(analytics_data["scans_over_time"]) == 1

    # 6. Delete single record
    del_resp = client.delete(f"/api/v1/history/{phish_id}")
    assert del_resp.status_code == 200
    assert client.get(f"/api/v1/history/{phish_id}").status_code == 404

    # 7. Clear remaining history
    clear_resp = client.delete("/api/v1/history")
    assert clear_resp.status_code == 200
    assert clear_resp.json()["deleted_count"] == 1
    assert client.get("/api/v1/history").json()["total"] == 0


def test_scan_validation_errors() -> None:
    for invalid_url in [
        "",
        "not-a-url",
        "javascript:alert(1)",
        "ftp://example.com/file",
        "https://invalid_domain_without_tld",
    ]:
        resp = client.post("/api/v1/scan", json={"url": invalid_url})
        assert resp.status_code == 422


def test_model_info_endpoint() -> None:
    resp = client.get("/api/v1/model/info")
    assert resp.status_code == 200
    data = resp.json()
    assert data["version"] == "v1.0.0"
    assert data["selected_model_name"] == "XGBoost"
    assert data["feature_count"] == 24
    assert len(data["candidate_models"]) == 4
    assert len(data["feature_importances"]) == 24
    assert data["test_metrics"]["roc_auc"] > 0.95


def test_scan_rate_limiting(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "RATE_LIMIT_PER_MINUTE", 2)
    scan_rate_limiter.reset()

    r1 = client.post("/api/v1/scan", json={"url": "https://www.google.com"})
    r2 = client.post("/api/v1/scan", json={"url": "https://www.wikipedia.org"})
    r3 = client.post("/api/v1/scan", json={"url": "https://www.python.org"})

    assert r1.status_code == 200
    assert r2.status_code == 200
    assert r3.status_code == 429
    assert "Rate limit exceeded" in r3.json()["detail"]

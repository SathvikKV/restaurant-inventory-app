import pytest
import uuid
import httpx

BASE = "https://kosh-api.sathvik-vadavatha.site"

def test_health(client):
    r = httpx.get(f"{BASE}/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"

def test_request_otp_mock(client):
    phone = f"+91{uuid.uuid4().int % 9000000000 + 1000000000}"
    r = client.post("/auth/request-otp", json={"phone": phone})
    assert r.status_code == 200
    data = r.json()
    assert "mock_otp" in data
    assert data["mock_otp"] == "123456"

def test_verify_otp_invalid(client):
    phone = f"+91{uuid.uuid4().int % 9000000000 + 1000000000}"
    client.post("/auth/request-otp", json={"phone": phone})
    r = client.post("/auth/verify-otp", json={"phone": phone, "otp": "000000"})
    assert r.status_code == 401

def test_verify_otp_success(client, auth_token):
    assert auth_token is not None
    assert len(auth_token) > 10

def test_get_me(client, scoped_token):
    r = client.get("/auth/me", headers={"Authorization": f"Bearer {scoped_token}"})
    assert r.status_code == 200
    data = r.json()
    assert "id" in data
    assert "phone" in data
    assert "role" in data

def test_get_me_no_token(client):
    r = client.get("/auth/me")
    assert r.status_code == 403

def test_refresh_token_no_cookie(client):
    r = client.post("/auth/refresh")
    assert r.status_code in [401, 200]

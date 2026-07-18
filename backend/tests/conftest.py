import pytest
import httpx
import uuid

BASE_URL = "https://kosh-api.sathvik-vadavatha.site/api/v1"
TEST_PHONE = f"+91{uuid.uuid4().int % 9000000000 + 1000000000}"

@pytest.fixture(scope="session")
def client():
    with httpx.Client(
        base_url=BASE_URL,
        timeout=30,
        follow_redirects=True
    ) as c:
        yield c

@pytest.fixture(scope="session")
def auth_token(client):
    r = client.post("/auth/request-otp", json={"phone": TEST_PHONE})
    assert r.status_code == 200
    mock_otp = r.json().get("mock_otp", "123456")
    r = client.post("/auth/verify-otp", json={"phone": TEST_PHONE, "otp": mock_otp})
    assert r.status_code == 200
    data = r.json()
    assert "access_token" in data
    return data["access_token"]

@pytest.fixture(scope="session")
def restaurant_token(client, auth_token):
    headers = {"Authorization": f"Bearer {auth_token}"}
    restaurant_name = f"Test Restaurant {uuid.uuid4().hex[:6]}"
    r = client.post("/restaurants", json={
        "name": restaurant_name,
        "city": "Hyderabad",
        "tenant_type": "restaurant"
    }, headers=headers)
    assert r.status_code == 200
    restaurant_id = r.json()["id"]
    r = client.post(f"/restaurants/{restaurant_id}/select", headers=headers)
    assert r.status_code == 200
    data = r.json()
    assert "access_token" in data
    return data["access_token"], restaurant_id

@pytest.fixture(scope="session")
def scoped_token(restaurant_token):
    return restaurant_token[0]

@pytest.fixture(scope="session")
def restaurant_id(restaurant_token):
    return restaurant_token[1]

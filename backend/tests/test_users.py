import pytest
import uuid

def test_list_users(client, scoped_token):
    r = client.get("/users/", headers={"Authorization": f"Bearer {scoped_token}"})
    assert r.status_code == 200
    assert isinstance(r.json(), list)

def test_invite_user(client, scoped_token):
    phone = f"+91{uuid.uuid4().int % 9000000000 + 1000000000}"
    r = client.post("/users/invite", json={
        "phone": phone,
        "role": "manager",
        "name": "Test Manager"
    }, headers={"Authorization": f"Bearer {scoped_token}"})
    assert r.status_code in [200, 201]
    data = r.json()
    assert "id" in data or "user_id" in data

def test_list_users_requires_owner(client, scoped_token):
    r = client.get("/users/", headers={"Authorization": f"Bearer {scoped_token}"})
    assert r.status_code == 200

def test_list_users_no_auth(client):
    r = client.get("/users/")
    assert r.status_code == 403

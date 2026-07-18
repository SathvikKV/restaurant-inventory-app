import pytest

def test_list_wastage_empty(client, scoped_token):
    r = client.get("/wastage/", headers={"Authorization": f"Bearer {scoped_token}"})
    assert r.status_code == 200
    assert isinstance(r.json(), list)

def test_create_wastage(client, scoped_token):
    r = client.post("/wastage/", json={
        "item": "Test Paneer",
        "qty": 2.0,
        "unit": "kg",
        "reason": "Spoiled"
    }, headers={"Authorization": f"Bearer {scoped_token}"})
    assert r.status_code in [200, 201]
    data = r.json()
    assert data["item"] == "Test Paneer"
    assert data["qty"] == 2.0

def test_wastage_summary(client, scoped_token):
    r = client.get("/wastage/summary?days=7", headers={"Authorization": f"Bearer {scoped_token}"})
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, dict)

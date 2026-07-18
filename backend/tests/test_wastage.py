import pytest

@pytest.fixture(scope="module")
def wastage_item_id(client, scoped_token):
    # Create item
    r = client.post("/inventory/", json={
        "item": "Test Paneer",
        "unit": "kg",
        "current_qty": 10.0,
        "reorder_threshold": 2.0,
        "category": "Dairy"
    }, headers={"Authorization": f"Bearer {scoped_token}"})
    assert r.status_code in [200, 201], f"Create inventory failed: {r.text}"
    item_id = r.json()["id"]
    # Add stock so wastage can proceed
    r2 = client.post(f"/inventory/{item_id}/receive", json={
        "quantity": 10.0,
        "notes": "Setup stock for wastage test"
    }, headers={"Authorization": f"Bearer {scoped_token}"})
    assert r2.status_code == 200, f"Receive stock failed: {r2.text}"
    return item_id

def test_list_wastage_empty(client, scoped_token):
    r = client.get("/wastage/", headers={"Authorization": f"Bearer {scoped_token}"})
    assert r.status_code == 200
    assert isinstance(r.json(), list)

def test_create_wastage(client, scoped_token, wastage_item_id):
    r = client.post("/wastage/", json={
        "item_id": wastage_item_id,
        "quantity": 2.0,
        "reason": "Spoiled"
    }, headers={"Authorization": f"Bearer {scoped_token}"})
    assert r.status_code in [200, 201], f"Create wastage failed: {r.text}"
    data = r.json()
    assert data["quantity"] == 2.0

def test_wastage_summary(client, scoped_token):
    r = client.get("/wastage/summary?days=7", headers={"Authorization": f"Bearer {scoped_token}"})
    assert r.status_code == 200
    assert isinstance(r.json(), dict)

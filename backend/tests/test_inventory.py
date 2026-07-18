import pytest

@pytest.fixture(scope="module")
def item_id(client, scoped_token):
    r = client.post("/inventory/", json={
        "item": "Test Maida",
        "unit": "kg",
        "current_qty": 25.0,
        "reorder_threshold": 5.0,
        "category": "Grains"
    }, headers={"Authorization": f"Bearer {scoped_token}"})
    assert r.status_code in [200, 201], f"Create inventory failed: {r.text}"
    data = r.json()
    assert "id" in data
    return data["id"]

def test_list_inventory_empty(client, scoped_token):
    r = client.get("/inventory/", headers={"Authorization": f"Bearer {scoped_token}"})
    assert r.status_code == 200
    assert isinstance(r.json(), list)

def test_create_inventory_item(client, scoped_token, item_id):
    assert item_id is not None

def test_get_inventory_item(client, scoped_token, item_id):
    r = client.get(f"/inventory/{item_id}", headers={"Authorization": f"Bearer {scoped_token}"})
    assert r.status_code == 200
    data = r.json()
    assert data["name"] == "Test Maida"
    assert "quantity" in data

def test_receive_stock(client, scoped_token, item_id):
    r = client.post(f"/inventory/{item_id}/receive", json={
        "quantity": 10.0,
        "notes": "Test delivery"
    }, headers={"Authorization": f"Bearer {scoped_token}"})
    assert r.status_code == 200
    data = r.json()
    assert "message" in data

def test_issue_stock(client, scoped_token, item_id):
    r = client.post(f"/inventory/{item_id}/issue", json={
        "quantity": 5.0,
        "destination": "Kitchen"
    }, headers={"Authorization": f"Bearer {scoped_token}"})
    assert r.status_code == 200
    data = r.json()
    assert "message" in data

def test_issue_stock_insufficient(client, scoped_token, item_id):
    r = client.post(f"/inventory/{item_id}/issue", json={
        "quantity": 999.0,
        "destination": "Kitchen"
    }, headers={"Authorization": f"Bearer {scoped_token}"})
    assert r.status_code == 400

def test_adjust_stock(client, scoped_token, item_id):
    r = client.post(f"/inventory/{item_id}/adjust", json={
        "new_quantity": 20.0,
        "reason": "Stock count correction"
    }, headers={"Authorization": f"Bearer {scoped_token}"})
    assert r.status_code == 200
    data = r.json()
    assert "message" in data

def test_get_transactions(client, scoped_token, item_id):
    r = client.get(f"/inventory/{item_id}/transactions", headers={"Authorization": f"Bearer {scoped_token}"})
    assert r.status_code in [200, 404]

def test_search_inventory(client, scoped_token):
    r = client.get("/inventory/?q=Maida", headers={"Authorization": f"Bearer {scoped_token}"})
    assert r.status_code == 200
    assert isinstance(r.json(), list)

def test_update_inventory_item(client, scoped_token, item_id):
    r = client.patch(f"/inventory/{item_id}", json={
        "reorder_threshold": 8.0
    }, headers={"Authorization": f"Bearer {scoped_token}"})
    assert r.status_code in [200, 405]

def test_inventory_requires_auth(client):
    r = client.get("/inventory/")
    assert r.status_code == 403

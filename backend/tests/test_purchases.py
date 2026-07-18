import pytest

@pytest.fixture(scope="module")
def inv_item_id(client, scoped_token):
    r = client.post("/inventory/", json={
        "item": "Test Rice",
        "unit": "kg",
        "current_qty": 50.0,
        "reorder_threshold": 10.0,
        "category": "Dry Goods"
    }, headers={"Authorization": f"Bearer {scoped_token}"})
    assert r.status_code in [200, 201], f"Create inventory failed: {r.text}"
    return r.json()["id"]

@pytest.fixture(scope="module")
def po_id(client, scoped_token, inv_item_id):
    r = client.post("/purchase-orders/", json={
        "supplier_name": "Test Supplier",
        "item_id": inv_item_id,
        "quantity": 10.0,
        "notes": "Integration test PO"
    }, headers={"Authorization": f"Bearer {scoped_token}"})
    assert r.status_code == 201, f"Create PO failed: {r.text}"
    return r.json()["id"]

def test_list_purchase_orders(client, scoped_token):
    r = client.get("/purchase-orders/", headers={"Authorization": f"Bearer {scoped_token}"})
    assert r.status_code == 200
    assert isinstance(r.json(), list)

def test_create_purchase_order(client, scoped_token, po_id):
    assert po_id is not None

def test_get_purchase_order(client, scoped_token, po_id):
    r = client.get(f"/purchase-orders/{po_id}", headers={"Authorization": f"Bearer {scoped_token}"})
    assert r.status_code == 200
    data = r.json()
    assert data["supplier_name"] == "Test Supplier"
    assert data["status"] == "pending"

def test_approve_purchase_order(client, scoped_token, po_id):
    r = client.post(f"/purchase-orders/{po_id}/action", json={
        "action": "approved",
        "notes": "Approved in test"
    }, headers={"Authorization": f"Bearer {scoped_token}"})
    assert r.status_code == 200

def test_invalid_action(client, scoped_token, po_id):
    r = client.post(f"/purchase-orders/{po_id}/action", json={
        "action": "invalid_action"
    }, headers={"Authorization": f"Bearer {scoped_token}"})
    assert r.status_code in [400, 422]

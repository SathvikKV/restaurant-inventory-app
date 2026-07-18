import pytest

@pytest.fixture(scope="module")
def po_id(client, scoped_token):
    r = client.post("/purchase-orders/", json={
        "supplier": "Test Supplier",
        "items": [{"item": "Test Maida", "quantity": 10, "unit": "kg"}],
    }, headers={"Authorization": f"Bearer {scoped_token}"})
    assert r.status_code == 201
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
    assert data["supplier"] == "Test Supplier"
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
    assert r.status_code == 400

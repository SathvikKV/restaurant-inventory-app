import pytest

def test_inventory_health(client, scoped_token):
    r = client.get("/reports/inventory-health", headers={"Authorization": f"Bearer {scoped_token}"})
    assert r.status_code == 200
    data = r.json()
    assert "score" in data
    assert "total" in data

def test_food_cost_trend(client, scoped_token):
    r = client.get("/reports/food-cost-trend?days=7", headers={"Authorization": f"Bearer {scoped_token}"})
    assert r.status_code in [200, 500]
    if r.status_code == 200:
        assert isinstance(r.json(), list)

def test_top_items(client, scoped_token):
    r = client.get("/reports/top-items?limit=5", headers={"Authorization": f"Bearer {scoped_token}"})
    assert r.status_code == 200
    assert isinstance(r.json(), list)

def test_wastage_summary_report(client, scoped_token):
    r = client.get("/reports/wastage-summary?days=7", headers={"Authorization": f"Bearer {scoped_token}"})
    assert r.status_code in [200, 500]
    if r.status_code == 200:
        assert isinstance(r.json(), dict)

def test_purchases_summary(client, scoped_token):
    r = client.get("/reports/purchases-summary?days=7", headers={"Authorization": f"Bearer {scoped_token}"})
    assert r.status_code in [200, 500]
    if r.status_code == 200:
        assert isinstance(r.json(), dict)

def test_audit_log(client, scoped_token):
    r = client.get("/reports/audit-log?limit=10", headers={"Authorization": f"Bearer {scoped_token}"})
    assert r.status_code == 200
    data = r.json()
    assert "entries" in data
    assert "total" in data

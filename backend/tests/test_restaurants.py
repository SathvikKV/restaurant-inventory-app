import pytest
import uuid

def test_list_restaurants(client, auth_token):
    r = client.get("/restaurants", headers={"Authorization": f"Bearer {auth_token}"})
    assert r.status_code == 200
    assert isinstance(r.json(), list)

def test_get_restaurant(client, auth_token, restaurant_id):
    r = client.get(f"/restaurants/{restaurant_id}", headers={"Authorization": f"Bearer {auth_token}"})
    assert r.status_code == 200
    data = r.json()
    assert data["id"] == restaurant_id

def test_get_restaurant_not_found(client, auth_token):
    fake_id = str(uuid.uuid4())
    r = client.get(f"/restaurants/{fake_id}", headers={"Authorization": f"Bearer {auth_token}"})
    assert r.status_code == 404

def test_select_restaurant(client, auth_token, restaurant_id):
    r = client.post(f"/restaurants/{restaurant_id}/select", headers={"Authorization": f"Bearer {auth_token}"})
    assert r.status_code == 200
    data = r.json()
    assert "access_token" in data
    assert "schema" in data

import pytest

SYNC_SECRET = "c5d2ca25961bb2754348951455ddf410f2c40c88a2eb3fc2bc86212a19e6bc47"

def test_sync_ingest(client, scoped_token):
    # Get the schema name from auth
    r = client.get("/auth/me", headers={"Authorization": f"Bearer {scoped_token}"})
    # We need the schema from the JWT — use a known test schema
    # The schema is embedded in the token, so we test with the sync endpoint directly
    r = client.post("/sync/ingest", json={
        "schema_name": "test_schema_placeholder",
        "inventory": [],
        "purchases": []
    }, headers={"X-Sync-Token": SYNC_SECRET})
    # 400 is expected since schema doesn't exist — but auth should pass
    assert r.status_code in [200, 400]

def test_sync_ingest_no_token(client):
    r = client.post("/sync/ingest", json={
        "schema_name": "test",
        "inventory": [],
        "purchases": []
    })
    assert r.status_code == 401

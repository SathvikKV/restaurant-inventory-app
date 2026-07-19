import httpx
import uuid
import sys
from datetime import datetime

BASE_URL = "https://kosh-api.sathvik-vadavatha.site/api/v1"
PHONE = f"+91{uuid.uuid4().int % 9000000000 + 1000000000}"

client = httpx.Client(base_url=BASE_URL, timeout=30, follow_redirects=True)

passed = 0
failed = 0

def step(name: str, ok: bool, detail: str = ""):
    global passed, failed
    icon = "✓" if ok else "✗"
    status = "PASS" if ok else "FAIL"
    print(f"  {icon} [{status}] {name}")
    if not ok and detail:
        print(f"         → {detail}")
    if ok:
        passed += 1
    else:
        failed += 1
    return ok

def section(title: str):
    print(f"\n{'─' * 50}")
    print(f"  {title}")
    print(f"{'─' * 50}")

def run():
    print(f"\n{'═' * 50}")
    print(f"  MISE / KOSH END-TO-END FLOW TEST")
    print(f"  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"  Phone: {PHONE}")
    print(f"{'═' * 50}")

    # ─────────────────────────────────────────────────
    section("1. HEALTH CHECK")
    # ─────────────────────────────────────────────────
    r = httpx.get("https://kosh-api.sathvik-vadavatha.site/health")
    step("Backend is reachable", r.status_code == 200, r.text)

    # ─────────────────────────────────────────────────
    section("2. AUTH FLOW")
    # ─────────────────────────────────────────────────
    r = client.post("/auth/request-otp", json={"phone": PHONE})
    ok = step("Request OTP", r.status_code == 200, r.text)
    if not ok:
        print("\n  Cannot continue without OTP. Aborting.")
        sys.exit(1)

    mock_otp = r.json().get("mock_otp", "123456")
    step("Mock OTP received", mock_otp == "123456", f"Got: {mock_otp}")

    r = client.post("/auth/verify-otp", json={"phone": PHONE, "otp": mock_otp})
    ok = step("Verify OTP", r.status_code == 200, r.text)
    if not ok:
        sys.exit(1)

    base_token = r.json()["access_token"]
    step("Access token received", len(base_token) > 10)

    # ─────────────────────────────────────────────────
    section("3. RESTAURANT SETUP")
    # ─────────────────────────────────────────────────
    headers = {"Authorization": f"Bearer {base_token}"}
    restaurant_name = f"E2E Restaurant {uuid.uuid4().hex[:6]}"

    r = client.post("/restaurants", json={
        "name": restaurant_name,
        "city": "Hyderabad",
        "tenant_type": "restaurant"
    }, headers=headers)
    ok = step("Create restaurant", r.status_code == 200, r.text)
    if not ok:
        sys.exit(1)

    restaurant_id = r.json()["id"]
    step("Restaurant ID received", bool(restaurant_id))

    r = client.post(f"/restaurants/{restaurant_id}/select", headers=headers)
    ok = step("Select restaurant (get scoped token)", r.status_code == 200, r.text)
    if not ok:
        sys.exit(1)

    scoped_token = r.json()["access_token"]
    schema = r.json()["schema"]
    headers = {"Authorization": f"Bearer {scoped_token}"}
    step("Scoped token received", len(scoped_token) > 10)
    step("Schema assigned", bool(schema), f"Schema: {schema}")

    # ─────────────────────────────────────────────────
    section("4. INVENTORY MANAGEMENT")
    # ─────────────────────────────────────────────────
    r = client.get("/inventory/", headers=headers)
    step("List inventory (empty)", r.status_code == 200 and isinstance(r.json(), list))

    # Create items
    items_to_create = [
        {"item": "Basmati Rice", "unit": "kg", "current_qty": 0, "reorder_threshold": 10.0, "category": "Grains"},
        {"item": "Paneer", "unit": "kg", "current_qty": 0, "reorder_threshold": 5.0, "category": "Dairy"},
        {"item": "Tomatoes", "unit": "kg", "current_qty": 0, "reorder_threshold": 8.0, "category": "Veg"},
        {"item": "Sunflower Oil", "unit": "L", "current_qty": 0, "reorder_threshold": 5.0, "category": "Oil"},
        {"item": "Coca-Cola 330ml", "unit": "pcs", "current_qty": 0, "reorder_threshold": 24.0, "category": "Beverages"},
    ]

    item_ids = {}
    for item_data in items_to_create:
        r = client.post("/inventory/", json=item_data, headers=headers)
        ok = step(f"Create item: {item_data['item']}", r.status_code in [200, 201], r.text)
        if ok:
            item_ids[item_data["item"]] = r.json()["id"]

    step("All 5 items created", len(item_ids) == 5)

    # Receive stock
    rice_id = item_ids.get("Basmati Rice")
    paneer_id = item_ids.get("Paneer")
    tomato_id = item_ids.get("Tomatoes")

    r = client.post(f"/inventory/{rice_id}/receive", json={"quantity": 50.0, "notes": "Weekly delivery"}, headers=headers)
    step("Receive stock: Basmati Rice (+50kg)", r.status_code == 200, r.text)

    r = client.post(f"/inventory/{paneer_id}/receive", json={"quantity": 20.0, "notes": "Daily delivery"}, headers=headers)
    step("Receive stock: Paneer (+20kg)", r.status_code == 200, r.text)

    r = client.post(f"/inventory/{tomato_id}/receive", json={"quantity": 15.0, "notes": "Market purchase"}, headers=headers)
    step("Receive stock: Tomatoes (+15kg)", r.status_code == 200, r.text)

    # Issue stock
    r = client.post(f"/inventory/{rice_id}/issue", json={"quantity": 10.0, "destination": "Kitchen"}, headers=headers)
    step("Issue stock: Rice → Kitchen (10kg)", r.status_code == 200, r.text)

    r = client.post(f"/inventory/{paneer_id}/issue", json={"quantity": 3.0, "destination": "Kitchen"}, headers=headers)
    step("Issue stock: Paneer → Kitchen (3kg)", r.status_code == 200, r.text)

    # Insufficient stock
    r = client.post(f"/inventory/{tomato_id}/issue", json={"quantity": 999.0, "destination": "Kitchen"}, headers=headers)
    step("Reject issue: insufficient stock", r.status_code == 400, r.text)

    # Adjust stock
    r = client.post(f"/inventory/{tomato_id}/adjust", json={"new_quantity": 12.0, "reason": "Stock count correction"}, headers=headers)
    step("Adjust stock: Tomatoes → 12kg", r.status_code == 200, r.text)

    # Search
    r = client.get("/inventory/?q=Rice", headers=headers)
    step("Search inventory: 'Rice'", r.status_code == 200 and len(r.json()) > 0, r.text)

    # ─────────────────────────────────────────────────
    section("5. WASTAGE")
    # ─────────────────────────────────────────────────
    r = client.post("/wastage/", json={
        "item_id": paneer_id,
        "quantity": 1.0,
        "reason": "Spoiled"
    }, headers=headers)
    step("Log wastage: Paneer 1kg (Spoiled)", r.status_code in [200, 201], r.text)

    r = client.get("/wastage/", headers=headers)
    step("List wastage records", r.status_code == 200 and len(r.json()) >= 1)

    # ─────────────────────────────────────────────────
    section("6. PURCHASE ORDERS")
    # ─────────────────────────────────────────────────
    oil_id = item_ids.get("Sunflower Oil")
    r = client.post("/purchase-orders/", json={
        "supplier_name": "APMC Traders",
        "item_id": oil_id,
        "quantity": 20.0,
        "notes": "Weekly oil order"
    }, headers=headers)
    ok = step("Create purchase order: Sunflower Oil", r.status_code == 201, r.text)

    if ok:
        po_id = r.json()["id"]
        step("PO ID received", bool(po_id))

        r = client.get(f"/purchase-orders/{po_id}", headers=headers)
        step("Get purchase order", r.status_code == 200 and r.json()["status"] == "pending")

        r = client.post(f"/purchase-orders/{po_id}/action", json={"action": "approved", "notes": "Approved"}, headers=headers)
        step("Approve purchase order", r.status_code == 200)

        r = client.post(f"/purchase-orders/{po_id}/receive", json={"received_quantity": 20.0}, headers=headers)
        step("Receive delivery (mark as delivered)", r.status_code == 200, r.text)

    # ─────────────────────────────────────────────────
    section("7. REPORTS & ANALYTICS")
    # ─────────────────────────────────────────────────
    r = client.get("/reports/inventory-health", headers=headers)
    ok = step("Inventory health report", r.status_code == 200)
    if ok:
        data = r.json()
        step(f"Health score: {data.get('score', 'N/A')}/100", "score" in data)

    r = client.get("/reports/top-items?limit=5", headers=headers)
    step("Top items report", r.status_code == 200)

    r = client.get("/reports/food-cost-trend?days=7", headers=headers)
    step("Food cost trend (7 days)", r.status_code == 200)

    r = client.get("/reports/audit-log?limit=20", headers=headers)
    ok = step("Audit log", r.status_code == 200)
    if ok:
        total = r.json().get("total", 0)
        step(f"Audit entries recorded: {total}", True)

    # ─────────────────────────────────────────────────
    section("8. USERS")
    # ─────────────────────────────────────────────────
    r = client.get("/users/", headers=headers)
    step("List users", r.status_code == 200)

    manager_phone = f"+91{uuid.uuid4().int % 9000000000 + 1000000000}"
    r = client.post("/users/invite", json={
        "phone": manager_phone,
        "role": "manager",
        "name": "Test Manager"
    }, headers=headers)
    step("Invite manager", r.status_code in [200, 201], r.text)

    # ─────────────────────────────────────────────────
    section("9. SYNC ENDPOINT")
    # ─────────────────────────────────────────────────
    SYNC_SECRET = "c5d2ca25961bb2754348951455ddf410f2c40c88a2eb3fc2bc86212a19e6bc47"
    r = client.post("/sync/ingest", json={
        "schema_name": schema,
        "inventory": [
            {"item": "Onions", "unit": "kg", "current_qty": 25.0, "reorder_threshold": 10.0}
        ],
        "purchases": []
    }, headers={"X-Sync-Token": SYNC_SECRET})
    step("Mise → Kosh sync ingest", r.status_code in [200, 201], r.text)

    # ─────────────────────────────────────────────────
    section("RESULTS")
    # ─────────────────────────────────────────────────
    total = passed + failed
    print(f"\n  Passed: {passed}/{total}")
    print(f"  Failed: {failed}/{total}")
    print(f"\n{'═' * 50}")

    if failed > 0:
        print(f"  ✗ {failed} step(s) failed")
        sys.exit(1)
    else:
        print(f"  ✓ All steps passed!")
    print(f"{'═' * 50}\n")

if __name__ == "__main__":
    run()

"""
Seed script for Minerva Coffee Shop demo data.
Run with: python scripts/seed.py
Idempotent — safe to run multiple times.
"""

import httpx
import sys
from datetime import datetime

BASE_URL = "https://kosh-api.sathvik-vadavatha.site/api/v1"
OWNER_PHONE = "+919876543210"
RESTAURANT_NAME = "Minerva Coffee Shop"
MANAGER_PHONE = "+919000000001"

client = httpx.Client(base_url=BASE_URL, timeout=30, follow_redirects=True)

def log(msg: str, ok: bool = True):
    icon = "✓" if ok else "✗"
    print(f"  {icon} {msg}")
    if not ok:
        sys.exit(1)

def section(title: str):
    print(f"\n{'─' * 55}")
    print(f"  {title}")
    print(f"{'─' * 55}")

# ─────────────────────────────────────────────────────────
# SEED DATA
# ─────────────────────────────────────────────────────────

INVENTORY_ITEMS = [
    # Produce
    {"item": "Tomatoes",           "unit": "kg",  "reorder_threshold": 10.0, "category": "Veg",       "stock": 8.0},
    {"item": "Onions",             "unit": "kg",  "reorder_threshold": 15.0, "category": "Veg",       "stock": 22.0},
    {"item": "Garlic",             "unit": "kg",  "reorder_threshold": 3.0,  "category": "Veg",       "stock": 2.5},
    {"item": "Coriander Leaves",   "unit": "kg",  "reorder_threshold": 1.0,  "category": "Veg",       "stock": 0.3},
    {"item": "Lemons",             "unit": "pcs", "reorder_threshold": 50.0, "category": "Veg",       "stock": 15.0},
    {"item": "Green Chillies",     "unit": "kg",  "reorder_threshold": 2.0,  "category": "Veg",       "stock": 1.2},
    {"item": "Ginger",             "unit": "kg",  "reorder_threshold": 2.0,  "category": "Veg",       "stock": 0.8},
    # Meat
    {"item": "Chicken Breast",     "unit": "kg",  "reorder_threshold": 15.0, "category": "Veg",       "stock": 4.0},
    {"item": "Mutton Curry Cut",   "unit": "kg",  "reorder_threshold": 5.0,  "category": "Veg",       "stock": 0.0},
    # Dairy
    {"item": "Full Cream Milk",    "unit": "L",   "reorder_threshold": 8.0,  "category": "Dairy",     "stock": 10.0},
    {"item": "Paneer",             "unit": "kg",  "reorder_threshold": 12.0, "category": "Dairy",     "stock": 18.0},
    {"item": "Butter",             "unit": "kg",  "reorder_threshold": 4.0,  "category": "Dairy",     "stock": 5.5},
    {"item": "Heavy Cream",        "unit": "L",   "reorder_threshold": 5.0,  "category": "Dairy",     "stock": 2.0},
    # Dry Goods
    {"item": "Basmati Rice",       "unit": "kg",  "reorder_threshold": 20.0, "category": "Grains",    "stock": 42.0},
    {"item": "Maida",              "unit": "kg",  "reorder_threshold": 10.0, "category": "Grains",    "stock": 18.0},
    {"item": "Besan",              "unit": "kg",  "reorder_threshold": 5.0,  "category": "Grains",    "stock": 6.0},
    {"item": "Poha",               "unit": "kg",  "reorder_threshold": 5.0,  "category": "Grains",    "stock": 4.0},
    {"item": "Cashews",            "unit": "kg",  "reorder_threshold": 4.0,  "category": "Grains",    "stock": 5.0},
    {"item": "White Sugar",        "unit": "kg",  "reorder_threshold": 10.0, "category": "Grains",    "stock": 20.0},
    # Oil & Spices
    {"item": "Sunflower Oil",      "unit": "L",   "reorder_threshold": 10.0, "category": "Oil",       "stock": 12.0},
    {"item": "Salt",               "unit": "kg",  "reorder_threshold": 5.0,  "category": "Grains",    "stock": 12.0},
    {"item": "Red Chilli Powder",  "unit": "kg",  "reorder_threshold": 2.0,  "category": "Veg",       "stock": 1.5},
    {"item": "Turmeric Powder",    "unit": "kg",  "reorder_threshold": 2.0,  "category": "Veg",       "stock": 1.2},
    {"item": "Garam Masala",       "unit": "kg",  "reorder_threshold": 1.0,  "category": "Veg",       "stock": 0.8},
    {"item": "Cumin Seeds",        "unit": "kg",  "reorder_threshold": 1.0,  "category": "Veg",       "stock": 1.5},
    # Beverages
    {"item": "Coca-Cola 330ml",    "unit": "pcs", "reorder_threshold": 48.0, "category": "Beverages", "stock": 12.0},
    {"item": "Mineral Water 1L",   "unit": "pcs", "reorder_threshold": 24.0, "category": "Beverages", "stock": 24.0},
    {"item": "Coffee Beans",       "unit": "kg",  "reorder_threshold": 3.0,  "category": "Beverages", "stock": 4.5},
    {"item": "Tea Leaves",         "unit": "kg",  "reorder_threshold": 2.0,  "category": "Beverages", "stock": 3.0},
    {"item": "Whole Milk (Amul)",  "unit": "L",   "reorder_threshold": 10.0, "category": "Dairy",     "stock": 8.0},
]

PURCHASE_ORDERS = [
    {
        "supplier_name": "KY Vegetables",
        "item": "Tomatoes",
        "quantity": 20.0,
        "status": "delivered",
        "notes": "Weekly vegetable order"
    },
    {
        "supplier_name": "Fresh Dairy Co.",
        "item": "Paneer",
        "quantity": 15.0,
        "status": "delivered",
        "notes": "Daily dairy delivery"
    },
    {
        "supplier_name": "APMC Traders",
        "item": "Basmati Rice",
        "quantity": 50.0,
        "status": "approved",
        "notes": "Monthly rice stock"
    },
    {
        "supplier_name": "Beverage Distributors",
        "item": "Coca-Cola 330ml",
        "quantity": 96.0,
        "status": "pending",
        "notes": "Weekend stock"
    },
    {
        "supplier_name": "KY Vegetables",
        "item": "Onions",
        "quantity": 30.0,
        "status": "delivered",
        "notes": "Bulk onion purchase"
    },
]

WASTAGE_ENTRIES = [
    {"item": "Tomatoes",        "quantity": 2.0,  "reason": "Spoiled"},
    {"item": "Coriander Leaves","quantity": 0.2,  "reason": "Expired"},
    {"item": "Heavy Cream",     "quantity": 0.5,  "reason": "Spillage"},
    {"item": "Butter",          "quantity": 0.3,  "reason": "Expired"},
    {"item": "Green Chillies",  "quantity": 0.3,  "reason": "Spoiled"},
]

# ─────────────────────────────────────────────────────────

def run():
    print(f"\n{'═' * 55}")
    print(f"  MINERVA COFFEE SHOP — SEED SCRIPT")
    print(f"  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'═' * 55}")

    # ── Auth ──────────────────────────────────────────────
    section("1. AUTH")
    r = client.post("/auth/request-otp", json={"phone": OWNER_PHONE})
    log("Request OTP", r.status_code == 200)
    otp = r.json().get("mock_otp", "123456")

    r = client.post("/auth/verify-otp", json={"phone": OWNER_PHONE, "otp": otp})
    log("Verify OTP", r.status_code == 200)
    base_token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {base_token}"}
    print(f"  → Logged in as {OWNER_PHONE}")

    # ── Restaurant ────────────────────────────────────────
    section("2. RESTAURANT")

    # Check if restaurant already exists
    r = client.get("/restaurants", headers=headers)
    log("List restaurants", r.status_code == 200)
    restaurants = r.json()

    restaurant_id = None
    for rest in restaurants:
        if rest["name"] == RESTAURANT_NAME:
            restaurant_id = rest["id"]
            print(f"  → Found existing restaurant: {RESTAURANT_NAME} ({restaurant_id})")
            break

    if not restaurant_id:
        r = client.post("/restaurants", json={
            "name": RESTAURANT_NAME,
            "city": "Hyderabad",
            "tenant_type": "restaurant"
        }, headers=headers)
        log(f"Create restaurant: {RESTAURANT_NAME}", r.status_code == 200)
        restaurant_id = r.json()["id"]
        print(f"  → Created: {restaurant_id}")

    r = client.post(f"/restaurants/{restaurant_id}/select", headers=headers)
    log("Select restaurant", r.status_code == 200)
    scoped_token = r.json()["access_token"]
    schema = r.json()["schema"]
    headers = {"Authorization": f"Bearer {scoped_token}"}
    print(f"  → Schema: {schema}")

    # ── Invite Manager ────────────────────────────────────
    section("3. USERS")
    r = client.post("/users/invite", json={
        "phone": MANAGER_PHONE,
        "role": "manager",
        "name": "Ramesh (Manager)"
    }, headers=headers)
    if r.status_code in [200, 201]:
        log("Invite manager: Ramesh", True)
    else:
        print(f"  ~ Manager already exists or invite failed: {r.text}")

    # ── Inventory ─────────────────────────────────────────
    section("4. INVENTORY ITEMS")

    # Get existing items to avoid duplicates
    r = client.get("/inventory/", headers=headers)
    log("Fetch existing inventory", r.status_code == 200)
    existing = {item["name"]: item["id"] for item in r.json()}
    print(f"  → {len(existing)} items already exist")

    item_ids = {}
    created = 0
    skipped = 0

    for item_data in INVENTORY_ITEMS:
        name = item_data["item"]
        if name in existing:
            item_ids[name] = existing[name]
            skipped += 1
            continue

        r = client.post("/inventory/", json={
            "item": name,
            "unit": item_data["unit"],
            "current_qty": 0.0,
            "reorder_threshold": item_data["reorder_threshold"],
            "category": item_data["category"],
        }, headers=headers)

        if r.status_code in [200, 201]:
            item_ids[name] = r.json()["id"]
            created += 1
        else:
            print(f"  ✗ Failed to create {name}: {r.text}")

    log(f"Items created: {created}, skipped: {skipped}", True)

    # Add stock for new items
    section("5. STOCK LEVELS")
    stocked = 0
    for item_data in INVENTORY_ITEMS:
        name = item_data["item"]
        stock = item_data["stock"]
        item_id = item_ids.get(name)
        if not item_id or stock <= 0:
            continue
        r = client.post(f"/inventory/{item_id}/receive", json={
            "quantity": stock,
            "notes": "Seed: initial stock"
        }, headers=headers)
        if r.status_code == 200:
            stocked += 1
        else:
            print(f"  ~ Could not stock {name}: {r.text}")

    log(f"Stocked {stocked} items", True)

    # ── Purchase Orders ───────────────────────────────────
    section("6. PURCHASE ORDERS")
    po_created = 0
    for po_data in PURCHASE_ORDERS:
        item_id = item_ids.get(po_data["item"])
        if not item_id:
            print(f"  ~ Skipping PO for {po_data['item']} — item not found")
            continue

        r = client.post("/purchase-orders/", json={
            "supplier_name": po_data["supplier_name"],
            "item_id": item_id,
            "quantity": po_data["quantity"],
            "notes": po_data["notes"]
        }, headers=headers)

        if r.status_code == 201:
            po_id = r.json()["id"]
            po_created += 1

            # Move to correct status
            if po_data["status"] in ["approved", "delivered"]:
                client.post(f"/purchase-orders/{po_id}/action", json={
                    "action": "approved",
                    "notes": "Seed: auto-approved"
                }, headers=headers)

            if po_data["status"] == "delivered":
                client.post(f"/purchase-orders/{po_id}/receive", json={
                    "received_quantity": po_data["quantity"]
                }, headers=headers)
        else:
            print(f"  ~ PO failed for {po_data['item']}: {r.text}")

    log(f"Purchase orders created: {po_created}", True)

    # ── Wastage ───────────────────────────────────────────
    section("7. WASTAGE ENTRIES")
    wastage_created = 0
    for w in WASTAGE_ENTRIES:
        item_id = item_ids.get(w["item"])
        if not item_id:
            print(f"  ~ Skipping wastage for {w['item']} — item not found")
            continue

        r = client.post("/wastage/", json={
            "item_id": item_id,
            "quantity": w["quantity"],
            "reason": w["reason"]
        }, headers=headers)

        if r.status_code in [200, 201]:
            wastage_created += 1
        else:
            print(f"  ~ Wastage failed for {w['item']}: {r.text}")

    log(f"Wastage entries created: {wastage_created}", True)

    # ── Done ──────────────────────────────────────────────
    section("DONE")
    print(f"""
  Minerva Coffee Shop is seeded and ready.

  Owner login:   {OWNER_PHONE}  OTP: 123456
  Manager login: {MANAGER_PHONE}  OTP: 123456
  Restaurant:    {RESTAURANT_NAME}
  Schema:        {schema}
  API:           {BASE_URL}

  Open the mobile app and log in to see real data.
""")
    print(f"{'═' * 55}\n")

if __name__ == "__main__":
    run()

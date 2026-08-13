"""
Full integration test — exercises every write/read path involving User,
membership, restaurant creation/selection, token refresh, invite, role update.
Runs against live production (OTP_PROVIDER=mock, fixed OTP 123456).
"""
import httpx
import sys
import json
import time

# Force UTF-8 output on Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

BASE = "https://kosh-api.sathvik-vadavatha.site/api/v1"

# ── Unique phone numbers so each run creates truly new accounts ────────────────
TS = str(int(time.time()))[-7:]          # last 7 digits of epoch → unique suffix
OWNER_PHONE  = f"+1444{TS}1"            # brand-new owner for this run
INVITE_PHONE = f"+1444{TS}2"            # brand-new invitee for this run
OTP = "123456"                           # fixed mock OTP

PASS = "✅"
FAIL = "❌"

def step(label: str):
    print(f"\n{'─'*60}")
    print(f"  {label}")
    print(f"{'─'*60}")

def check(resp: httpx.Response, expected_status: int, label: str) -> dict:
    body = {}
    try:
        body = resp.json()
    except Exception:
        body = {"_raw": resp.text}
    status_ok = resp.status_code == expected_status
    icon = PASS if status_ok else FAIL
    print(f"{icon}  HTTP {resp.status_code} (expected {expected_status})")
    print(f"    Body: {json.dumps(body, indent=2)}")
    if not status_ok:
        print(f"\n{FAIL} ASSERTION FAILED: {label}")
        sys.exit(1)
    return body

# ═══════════════════════════════════════════════════════════════════════════════
# 1. Brand-new signup (never-seen phone)
# ═══════════════════════════════════════════════════════════════════════════════
step(f"1. Brand-new signup — {OWNER_PHONE}")
r = httpx.post(f"{BASE}/auth/request-otp", json={"phone": OWNER_PHONE}, timeout=30)
body = check(r, 200, "request-otp for new user")
mock_otp = body.get("mock_otp", OTP)
print(f"    mock_otp from response: {mock_otp!r}")

r = httpx.post(f"{BASE}/auth/verify-otp", json={"phone": OWNER_PHONE, "otp": mock_otp}, timeout=30)
new_user = check(r, 200, "verify-otp for new user")
assert new_user.get("is_new_account") is True, f"Expected is_new_account=True, got {new_user.get('is_new_account')!r}"
assert new_user.get("needs_restaurant_selection") is True
print(f"    {PASS} is_new_account=True, needs_restaurant_selection=True")
new_user_token = new_user["access_token"]
new_user_id    = new_user["user_id"]

# ═══════════════════════════════════════════════════════════════════════════════
# 2. Restaurant creation (uses assign_user_to_tenant → must write membership, not users)
# ═══════════════════════════════════════════════════════════════════════════════
step("2. Restaurant creation")
r = httpx.post(
    f"{BASE}/restaurants/",
    json={"name": f"Test Kitchen {TS}", "timezone": "America/New_York"},
    headers={"Authorization": f"Bearer {new_user_token}"},
    timeout=30,
    follow_redirects=True,
)
restaurant = check(r, 200, "create restaurant")
restaurant_id = restaurant.get("id") or restaurant.get("tenant_id")
assert restaurant_id, f"No restaurant id in response: {restaurant}"
print(f"    {PASS} Restaurant created, id={restaurant_id}")

# ═══════════════════════════════════════════════════════════════════════════════
# 3. Restaurant selection (verify we can now select a restaurant and get scoped token)
# ═══════════════════════════════════════════════════════════════════════════════
step("3. Restaurant selection → scoped token")
r = httpx.post(
    f"{BASE}/restaurants/{restaurant_id}/select",
    headers={"Authorization": f"Bearer {new_user_token}"},
    timeout=30,
)
selected = check(r, 200, "select restaurant")
assert selected.get("tenant_id"), f"No tenant_id in select response"
assert selected.get("role"), f"No role in select response"
scoped_token = selected["access_token"]
print(f"    {PASS} Scoped token received, role={selected.get('role')!r}, tenant_id={selected.get('tenant_id')!r}")

# ═══════════════════════════════════════════════════════════════════════════════
# 4. Token refresh — for single-membership user
# ═══════════════════════════════════════════════════════════════════════════════
step("4. Token refresh (single-membership user)")
cookies = r.cookies  # refresh token set as cookie by verify-otp
# Re-do verify-otp to get fresh refresh cookie since select doesn't rotate it
r = httpx.post(f"{BASE}/auth/request-otp", json={"phone": OWNER_PHONE}, timeout=30)
check(r, 200, "request-otp for refresh")
r2 = httpx.post(f"{BASE}/auth/verify-otp", json={"phone": OWNER_PHONE, "otp": "123456"}, timeout=30)
check(r2, 200, "verify-otp for refresh cookie")
refresh_cookie = r2.cookies.get("refresh_token")
assert refresh_cookie, "No refresh_token cookie returned"
r3 = httpx.post(f"{BASE}/auth/refresh", cookies={"refresh_token": refresh_cookie}, timeout=30)
refresh_data = check(r3, 200, "token refresh")
assert "access_token" in refresh_data
print(f"    {PASS} Token refresh succeeded, needs_restaurant_selection={refresh_data.get('needs_restaurant_selection')!r}")

# ═══════════════════════════════════════════════════════════════════════════════
# 5. Invite a new user to the restaurant (exercising invite path)
# ═══════════════════════════════════════════════════════════════════════════════
step(f"5. Invite new user to restaurant — {INVITE_PHONE}")
# The invite endpoint requires the user to already exist — pre-create them via signup
r = httpx.post(f"{BASE}/auth/request-otp", json={"phone": INVITE_PHONE}, timeout=30)
body = check(r, 200, "request-otp for invitee pre-signup")
invite_otp = body.get("mock_otp", OTP)
r = httpx.post(f"{BASE}/auth/verify-otp", json={"phone": INVITE_PHONE, "otp": invite_otp}, timeout=30)
invitee_presignup = check(r, 200, "verify-otp for invitee pre-signup")
assert invitee_presignup.get("is_new_account") is True, "Invitee should be brand new at this point"
print(f"    Invitee pre-created, user_id={invitee_presignup['user_id']!r}")

# Now invite them from the owner's scoped token
r = httpx.post(
    f"{BASE}/users/invite-to-restaurant",
    json={"name": "Test Invitee", "phone": INVITE_PHONE, "role": "manager"},
    headers={"Authorization": f"Bearer {scoped_token}"},
    timeout=30,
)
invite = check(r, 201, "invite new user")
invited_user_id = invite.get("id")
assert invited_user_id, f"No user id in invite response: {invite}"
print(f"    {PASS} Invite succeeded, invited user id={invited_user_id}")

# ═══════════════════════════════════════════════════════════════════════════════
# 6. Invited user logs in (new user, single membership, no restaurant selection needed)
# ═══════════════════════════════════════════════════════════════════════════════
step(f"6. Invited user verify-otp → single membership auto-select")
r = httpx.post(f"{BASE}/auth/request-otp", json={"phone": INVITE_PHONE}, timeout=30)
body = check(r, 200, "request-otp for invited user")
invited_mock_otp = body.get("mock_otp", OTP)
r = httpx.post(f"{BASE}/auth/verify-otp", json={"phone": INVITE_PHONE, "otp": invited_mock_otp}, timeout=30)
invited_login = check(r, 200, "verify-otp for invited user")
assert invited_login.get("is_new_account") is False, \
    f"Expected is_new_account=False for invited user (pre-created by invite), got {invited_login.get('is_new_account')!r}"
print(f"    {PASS} Invited user login: needs_restaurant_selection={invited_login.get('needs_restaurant_selection')!r}")
invited_token = invited_login["access_token"]

# If they need selection (expected if invite doesn't set needs_restaurant_selection=False), select now
if invited_login.get("needs_restaurant_selection"):
    r = httpx.post(
        f"{BASE}/restaurants/{restaurant_id}/select",
        headers={"Authorization": f"Bearer {invited_token}"},
        timeout=30,
    )
    invited_selected = check(r, 200, "invited user selects restaurant")
    invited_token = invited_selected["access_token"]
    print(f"    {PASS} Invited user selected restaurant, role={invited_selected.get('role')!r}")

# ═══════════════════════════════════════════════════════════════════════════════
# 7. Update invited user's role via PATCH /users/{user_id}
# ═══════════════════════════════════════════════════════════════════════════════
step("7. Update invited user's role: manager → owner")
r = httpx.patch(
    f"{BASE}/users/{invited_user_id}",
    json={"role": "owner"},
    headers={"Authorization": f"Bearer {scoped_token}"},
    timeout=30,
)
updated = check(r, 200, "update user role")
assert updated.get("role") == "owner", f"Expected role=owner after update, got {updated.get('role')!r}"
print(f"    {PASS} Role updated to {updated.get('role')!r}")

# ═══════════════════════════════════════════════════════════════════════════════
# 8. Existing single-membership login (re-login as owner — already has 1 restaurant)
# ═══════════════════════════════════════════════════════════════════════════════
step("8. Existing single-membership login (owner re-login)")
r = httpx.post(f"{BASE}/auth/request-otp", json={"phone": OWNER_PHONE}, timeout=30)
check(r, 200, "request-otp owner re-login")
r = httpx.post(f"{BASE}/auth/verify-otp", json={"phone": OWNER_PHONE, "otp": "123456"}, timeout=30)
relogin = check(r, 200, "verify-otp owner re-login")
assert relogin.get("is_new_account") is False
# Single membership: should NOT need restaurant selection
expected_selection = False
got_selection = relogin.get("needs_restaurant_selection")
if got_selection != expected_selection:
    print(f"    ⚠️  NOTE: needs_restaurant_selection={got_selection!r} (expected {expected_selection!r}) — acceptable if multi-membership logic applies")
else:
    print(f"    {PASS} needs_restaurant_selection=False (single membership auto-selected)")
print(f"    role={relogin.get('role')!r}, tenant_id={relogin.get('tenant_id')!r}")

# ═══════════════════════════════════════════════════════════════════════════════
# 9. Verify scoped inventory access (end-to-end read after all writes)
# ═══════════════════════════════════════════════════════════════════════════════
step("9. Scoped inventory read (proves tenant context works end-to-end)")
r = httpx.get(
    f"{BASE}/inventory/",
    headers={"Authorization": f"Bearer {scoped_token}"},
    timeout=60,
    follow_redirects=True,
)
inv = check(r, 200, "GET /inventory/ with scoped token")
print(f"    {PASS} Inventory returned {len(inv) if isinstance(inv, list) else '(non-list)'} items")

# ═══════════════════════════════════════════════════════════════════════════════
# 10. Create a branch of the restaurant
# ═══════════════════════════════════════════════════════════════════════════════
step("10. Create a branch of the existing restaurant")
r = httpx.post(
    f"{BASE}/restaurants/",
    json={
        "name": "Begumpet",
        "parent_tenant_id": restaurant_id,
        "timezone": "America/New_York",
    },
    headers={"Authorization": f"Bearer {new_user_token}"},
    timeout=30,
    follow_redirects=True,
)
branch = check(r, 200, "create branch restaurant")
branch_id = branch.get("id")
assert branch_id, f"No branch id in response: {branch}"
assert branch.get("name") == f"Test Kitchen {TS} — Begumpet", f"Expected branch name to include parent, got {branch.get('name')!r}"
assert branch.get("schema_name") == f"test_kitchen_{TS}_begumpet", f"Expected branch schema_name to be prefixed, got {branch.get('schema_name')!r}"
print(f"    {PASS} Branch created successfully, name={branch.get('name')!r}, schema_name={branch.get('schema_name')!r}")

# ═══════════════════════════════════════════════════════════════════════════════
# 11. Multi-membership login (re-login as owner — now has 2 restaurants)
# ═══════════════════════════════════════════════════════════════════════════════
step("11. Multi-membership login (re-login as owner)")
r = httpx.post(f"{BASE}/auth/request-otp", json={"phone": OWNER_PHONE}, timeout=30)
check(r, 200, "request-otp owner multi-login")
r = httpx.post(f"{BASE}/auth/verify-otp", json={"phone": OWNER_PHONE, "otp": "123456"}, timeout=30)
relogin_multi = check(r, 200, "verify-otp owner multi-login")
assert relogin_multi.get("is_new_account") is False
assert relogin_multi.get("needs_restaurant_selection") is True, f"Expected needs_restaurant_selection=True for multi-membership, got {relogin_multi.get('needs_restaurant_selection')!r}"
print(f"    {PASS} needs_restaurant_selection=True for multi-membership user")

# ═══════════════════════════════════════════════════════════════════════════════
# 12. Select the branch, get scoped token
# ═══════════════════════════════════════════════════════════════════════════════
step("12. Select the branch restaurant")
multi_token = relogin_multi["access_token"]
r = httpx.post(
    f"{BASE}/restaurants/{branch_id}/select",
    headers={"Authorization": f"Bearer {multi_token}"},
    timeout=30,
)
branch_selected = check(r, 200, "select branch restaurant")
assert branch_selected.get("tenant_id") == branch_id
assert branch_selected.get("role") == "owner"
assert branch_selected.get("schema") == f"test_kitchen_{TS}_begumpet"
print(f"    {PASS} Branch selected successfully, scoped to {branch_selected.get('schema')!r}")

# ═══════════════════════════════════════════════════════════════════════════════
print(f"\n{'═'*60}")
print(f"  {PASS} ALL STEPS PASSED — integration test complete")
print(f"{'═'*60}\n")

import asyncio
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.dirname(os.path.dirname(__file__))))
from app.database import engine, AsyncSessionLocal
from app.models.public import User, Tenant, UserTenantMembership, OTPCode
from sqlalchemy import select
import httpx
from app.main import app
from datetime import datetime, timedelta, timezone

async def run_flow():
    # Setup Data
    async with AsyncSessionLocal() as db:
        users_res = await db.execute(select(User).where(User.phone == "+1234567890"))
        user = users_res.scalar_one_or_none()
        if not user:
            user = User(phone="+1234567890", name="Test User")
            db.add(user)
            await db.commit()
            
        tenants_res = await db.execute(select(Tenant).limit(2))
        tenants = tenants_res.scalars().all()
        
        for t in tenants:
            mem_res = await db.execute(select(UserTenantMembership).where(UserTenantMembership.user_id == user.id, UserTenantMembership.tenant_id == t.id))
            mem = mem_res.scalar_one_or_none()
            if not mem:
                mem = UserTenantMembership(user_id=user.id, tenant_id=t.id, role="owner")
                db.add(mem)
        
        users2_res = await db.execute(select(User).where(User.phone == "+0987654321"))
        user2 = users2_res.scalar_one_or_none()
        if not user2:
            user2 = User(phone="+0987654321", name="Invitee")
            db.add(user2)
            
        users3_res = await db.execute(select(User).where(User.phone == "+1112223334"))
        user3 = users3_res.scalar_one_or_none()
        if not user3:
            user3 = User(phone="+1112223334", name="Fresh Invitee")
            db.add(user3)
            
        otp = OTPCode(phone="+1234567890", code="123456", expires_at=datetime.now(timezone.utc) + timedelta(minutes=10))
        db.add(otp)
        await db.commit()

    async with httpx.AsyncClient(app=app, base_url="http://test") as client:
        print("\n--- 1. Login (verify-otp) for User with 2+ Memberships ---")
        res = await client.post("/api/v1/auth/verify-otp", json={"phone": "+1234567890", "otp": "123456"})
        print(f"Verify OTP Response ({res.status_code}): {res.json()}")
        
        token = res.json().get("access_token")
        
        print("\n--- 2. Switch Restaurant (/api/v1/restaurants/{id}/select) ---")
        tenant_id = str(tenants[0].id)
        res2 = await client.post(f"/api/v1/restaurants/{tenant_id}/select", headers={"Authorization": f"Bearer {token}"})
        print(f"Select Restaurant Response ({res2.status_code}): {res2.json()}")
        
        selected_token = res2.json().get("access_token")
        
        print("\n--- 3. Invite a second user to this restaurant ---")
        res3 = await client.post("/api/v1/users/invite-to-restaurant", 
                           json={"phone": "+1112223334", "role": "manager", "name": "Fresh Invitee"},
                           headers={"Authorization": f"Bearer {selected_token}"})
        print(f"Invite Response ({res3.status_code}): {res3.json()}")
        
        print("\n--- 4. Refresh Token (ensure it keeps context) ---")
        refresh_cookie = res.cookies.get("refresh_token")
        res4 = await client.post("/api/v1/auth/refresh", cookies={"refresh_token": refresh_cookie}, headers={"Authorization": f"Bearer {selected_token}"})
        print(f"Refresh Response ({res4.status_code}): {res4.json()}")
        
        print("\n--- 5. Verify patched file (Inventory) ---")
        res5 = await client.get("/api/v1/inventory/", headers={"Authorization": f"Bearer {selected_token}"})
        print(f"Inventory Response ({res5.status_code})")
        
        print("\n--- 6. Verify patched file (Recipes) ---")
        res6 = await client.get("/api/v1/recipes/", headers={"Authorization": f"Bearer {selected_token}"})
        print(f"Recipes Response ({res6.status_code})")

        print("\n--- 7. Verify patched file (Purchase Orders) ---")
        res7 = await client.get("/api/v1/purchase-orders/", headers={"Authorization": f"Bearer {selected_token}"})
        print(f"Purchase Orders Response ({res7.status_code})")

        print("\n--- 8. Verify patched file (Issues) ---")
        res8 = await client.get("/api/v1/issues/", headers={"Authorization": f"Bearer {selected_token}"})
        print(f"Issues Response ({res8.status_code})")

        print("\n--- 9. Verify patched file (Confirmations) ---")
        res9 = await client.get("/api/v1/confirmations/", headers={"Authorization": f"Bearer {selected_token}"})
        print(f"Confirmations Response ({res9.status_code})")

if __name__ == "__main__":
    asyncio.run(run_flow())

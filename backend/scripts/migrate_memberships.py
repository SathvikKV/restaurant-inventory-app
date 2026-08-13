import asyncio
import os
import sys

# Add the backend directory to sys.path so we can import app modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import select
from app.database import engine, AsyncSessionLocal
from app.models.public import Base, User, UserTenantMembership

async def run_migration():
    print("Starting membership migration...")
    
    # Create the new table if it doesn't exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        print("Schema updated (UserTenantMembership table ensured).")

    total_users = 0
    newly_created_count = 0
    already_existed_count = 0
    null_tenant_count = 0

    async with AsyncSessionLocal() as db:
        # Get all users
        result = await db.execute(select(User))
        users = result.scalars().all()
        
        for user in users:
            total_users += 1
            if user.tenant_id is None:
                null_tenant_count += 1
            else:
                # Check if membership already exists
                mem_result = await db.execute(
                    select(UserTenantMembership)
                    .where(
                        UserTenantMembership.user_id == user.id,
                        UserTenantMembership.tenant_id == user.tenant_id
                    )
                )
                existing = mem_result.scalar_one_or_none()
                
                if not existing:
                    new_membership = UserTenantMembership(
                        user_id=user.id,
                        tenant_id=user.tenant_id,
                        role=user.role
                    )
                    db.add(new_membership)
                    newly_created_count += 1
                else:
                    already_existed_count += 1
                
        await db.commit()

    print("\n--- Migration Report ---")
    print(f"Total User rows examined: {total_users}")
    print(f"Newly created memberships: {newly_created_count}")
    print(f"Already existed memberships: {already_existed_count}")
    print(f"Rows with NULL tenant_id (skipped, expected): {null_tenant_count}")
    
    if (newly_created_count + already_existed_count + null_tenant_count) == total_users:
        print("Success: Every single user row is accounted for.")
    else:
        print("WARNING: Math mismatch! Total != Newly Created + Already Existed + Null")
        print(f"Sum of parts: {newly_created_count + already_existed_count + null_tenant_count}")

if __name__ == "__main__":
    asyncio.run(run_migration())

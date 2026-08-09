import asyncio
import os
import uuid
from sqlalchemy import select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import engine
from app.services.tenant_registry import get_tenant_models
from app.models.public import Tenant
from app.constants import INDENT_SOURCE
from datetime import datetime, timezone

async def test_indent_resolution():
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        result = await session.execute(select(Tenant.schema_name))
        schema_names = [row[0] for row in result.all()]
        if not schema_names:
            print("No tenants found.")
            return
        
        schema = schema_names[0]
        print(f"Using schema: {schema}")
        
        # Ensure column exists for tests
        try:
            from sqlalchemy import text
            await session.execute(text(f"ALTER TABLE {schema}.confirmations ADD COLUMN IF NOT EXISTS ai_match_reason VARCHAR(500)"))
            await session.commit()
        except Exception as e:
            print(f"Column might already exist or error: {e}")

        models = get_tenant_models(schema)
        PendingConfirmation = models["confirmations"]
        InventoryItem = models["inventory"]
        InventoryTransaction = models["inventory_transactions"]

        # 1. Create a dummy pending confirmation sourced from an indent
        new_conf = PendingConfirmation(
            extracted_name="Test Indent Missing Item " + str(uuid.uuid4())[:8],
            candidate_name="None",
            score=0.0,
            quantity=5.0,
            unit="kg",
            source=INDENT_SOURCE,
            source_reference="indent_test_123",
            status="pending"
        )
        session.add(new_conf)
        await session.commit()
        await session.refresh(new_conf)
        conf_id = new_conf.id
        extracted_name = new_conf.extracted_name
        
        print(f"Created pending confirmation: {conf_id} ({extracted_name})")

    # 2. Call resolve_confirmation via FastAPI TestClient
    # But wait, TestClient is synchronous and our DB is async, might be easier to just 
    # call the router function directly or use httpx with an ASGI app.
    # Actually, we can just call resolve_confirmation directly since we are in an async function.
    from app.routers.confirmations import resolve_confirmation, ResolveConfirmation
    from app.services.units import init_unit_cache
    import app.routers.confirmations as conf_router
    
    # Mock embedding to avoid API errors in script
    conf_router.get_embedding = lambda x: [0.0] * 768
    
    async with async_session() as session:
        try:
            await init_unit_cache(session)
            # We need a mock user dict
            user = {"user_id": "00000000-0000-0000-0000-000000000000", "schema": schema}
            body = ResolveConfirmation(action="different")
            
            await resolve_confirmation(
                confirmation_id=conf_id,
                body=body,
                user=user,
                db=session
            )
            print("Successfully resolved confirmation as 'different'")
        except Exception as e:
            print(f"Error resolving: {e}")
            
    # 3. Verify in DB
    async with async_session() as session:
        # Check the item
        result = await session.execute(select(InventoryItem).where(InventoryItem.item == extracted_name))
        item = result.scalar_one_or_none()
        
        if not item:
            print("FAILED: Item not created!")
        else:
            print(f"Item created. current_qty: {item.current_qty}")
            if item.current_qty < 0:
                print("SUCCESS: Item has negative quantity as expected.")
            else:
                print("FAILED: Item quantity is NOT negative!")
                
        # Check transaction log
        if item:
            result = await session.execute(
                select(InventoryTransaction).where(InventoryTransaction.item_id == item.id)
            )
            txn = result.scalars().first()
            if txn:
                print(f"Transaction logged: action={txn.action}, delta={txn.quantity_delta}, resulting_qty={txn.resulting_qty}")
                if txn.action == "unrecorded_consumption" and txn.quantity_delta < 0:
                    print("SUCCESS: Transaction is correct.")
                else:
                    print("FAILED: Transaction incorrect.")
            else:
                print("FAILED: No transaction found.")

if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv()
    asyncio.run(test_indent_resolution())

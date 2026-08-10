import asyncio
from app.database import engine
from app.services.units import init_unit_cache
from app.routers.purchase_orders import create_purchase_from_ocr, SaveOCRInvoiceRequest, OCRLineItemIn

async def main():
    async with engine.connect() as conn:
        await init_unit_cache(conn)
    
    req = SaveOCRInvoiceRequest(
        line_items=[
            OCRLineItemIn(item_name="All-purpose flour", quantity=10.0, unit="kg")
        ],
        tenant_schema="minerva_coffee_shop",
        recorded_by_name="Test"
    )

    actor = {"actor_type": "mise_service", "user_id": "test"}

    # Mock get_db session
    class MockDB:
        async def execute(self, *args, **kwargs):
            class Res:
                def scalars(self):
                    class Sc:
                        def all(self): return []
                    return Sc()
                def scalar_one_or_none(self): return None
            return Res()
        def add(self, *args): pass
        async def flush(self): pass
        async def commit(self): pass

    try:
        res = await create_purchase_from_ocr(req, actor, MockDB())
        print(res)
    except Exception as e:
        print(f"Error: {e}")

asyncio.run(main())

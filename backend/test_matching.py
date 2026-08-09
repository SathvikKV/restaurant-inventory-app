import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.routers.issues import create_issue_from_ocr, IndentSaveRequest, IndentLineItemIn
from app.routers.purchase_orders import create_purchase_from_ocr, SaveOCRInvoiceRequest, OCRLineItemIn
from app.database import get_db

async def run_test():
    # We will invoke the router function directly to bypass HTTP auth if it's too complex.
    # The router function expects `db` and `actor`.
    # Let's import the engine from app.database if possible.
    # Actually, it's easier to just do it via HTTP if there's a bypass or we can mint a token.
    # But wait, create_issue_from_ocr takes `actor` dict!
    
    from app.database import AsyncSessionLocal
    
    async with AsyncSessionLocal() as session:
        actor = {"actor_type": "mise_service", "schema": "public", "user_id": "system"}
        
        req = IndentSaveRequest(
            section="Kitchen",
            indent_number="IND-TEST-001",
            line_items=[
                IndentLineItemIn(item_name="Bogus NonExistent Truffle Oil 5L", quantity=1, unit="bottle")
            ],
            tenant_schema="public",
            recorded_by_name="Test Script"
        )
        
        print("Testing indent matching...")
        result = await create_issue_from_ocr(body=req, actor=actor, db=session)
        print("Indent Result:", result)

        req2 = SaveOCRInvoiceRequest(
            supplier_name="Test Supplier",
            line_items=[
                OCRLineItemIn(item_name="Bogus NonExistent Truffle Oil 5L", quantity=1, unit="bottle", unit_price=1000, total_price=1000)
            ],
            tenant_schema="public",
            recorded_by_name="Test Script"
        )
        print("Testing invoice matching...")
        result2 = await create_purchase_from_ocr(body=req2, actor=actor, db=session)
        print("Invoice Result:", result2)

if __name__ == "__main__":
    asyncio.run(run_test())

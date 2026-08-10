import asyncio
import httpx
from pydantic import BaseModel
from typing import List, Optional, Dict

class OCRLineItemIn(BaseModel):
    item_name: str
    quantity: float
    unit: str
    unit_price: Optional[float] = None
    total_price: Optional[float] = None

class SaveOCRInvoiceRequest(BaseModel):
    supplier_name: Optional[str] = None
    invoice_date: Optional[str] = None
    line_items: List[OCRLineItemIn]
    total_amount: Optional[float] = None
    resolutions: Optional[Dict[str, dict]] = None

async def main():
    req = SaveOCRInvoiceRequest(
        line_items=[
            OCRLineItemIn(item_name="All-purpose flour", quantity=10.0, unit="kg")
        ],
        resolutions={"All-purpose flour": {"same": False}}
    )
    
    # We will just print the JSON to see what we send
    print(req.model_dump_json(indent=2))

asyncio.run(main())

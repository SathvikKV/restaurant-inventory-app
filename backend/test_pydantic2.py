from pydantic import BaseModel
from typing import List

class OCRLineItemIn(BaseModel):
    item_name: str
    quantity: float
    unit: str

class Request(BaseModel):
    line_items: List[OCRLineItemIn]

req = Request(line_items=[OCRLineItemIn(item_name="Test", quantity=10, unit="kg")])

def normalize_to_base(q, u):
    return 10000.0, "g"

for line in req.line_items:
    line.quantity, line.unit = normalize_to_base(line.quantity, line.unit)

print(f"quantity={req.line_items[0].quantity}, unit='{req.line_items[0].unit}'")

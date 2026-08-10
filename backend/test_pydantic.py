from pydantic import BaseModel
from typing import Optional

class OCRLineItemIn(BaseModel):
    item_name: str
    quantity: float
    unit: str

line = OCRLineItemIn(item_name="Test", quantity=10, unit="kg")
def normalize_to_base(q, u):
    return 10000.0, "g"

line.quantity, line.unit = normalize_to_base(line.quantity, line.unit)
print(f"quantity={line.quantity}, unit='{line.unit}'")

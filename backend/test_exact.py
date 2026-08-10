from pydantic import BaseModel
from typing import List

class OCRLineItemIn(BaseModel):
    item_name: str
    quantity: float
    unit: str

class Request(BaseModel):
    line_items: List[OCRLineItemIn]

def test():
    body = Request(line_items=[OCRLineItemIn(item_name="All-purpose flour", quantity=10, unit="kg")])
    def normalize_to_base(q, u):
        return q * 1000.0, "g"

    for line in body.line_items:
        line.quantity, line.unit = normalize_to_base(line.quantity, line.unit)
    
    print(body.line_items[0].quantity, body.line_items[0].unit)

test()

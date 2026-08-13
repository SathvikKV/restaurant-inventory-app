"""
Helper module for pricing and cost conversions.
"""
from app.services.units import normalize_to_base

def price_per_base_unit(unit_price: float, purchase_unit: str) -> float:
    """Converts a price quoted in the original purchase unit (e.g. per kg)
    into a price per base unit (per gram/ml), computed once at ingest."""
    _, base_unit = normalize_to_base(1.0, purchase_unit)
    if base_unit in ("g", "ml"):
        conversion_factor = normalize_to_base(1.0, purchase_unit)[0]
        return unit_price / conversion_factor if conversion_factor else unit_price
    return unit_price

def update_moving_average_price(old_avg_price: float | None, old_qty: float, incoming_unit_price: float, incoming_purchase_unit: str, incoming_qty: float) -> int:
    """
    Computes the new moving average price per base unit (in paise).
    old_qty must be the quantity *before* the incoming quantity was added.
    """
    incoming_price_per_base_unit = price_per_base_unit(incoming_unit_price, incoming_purchase_unit)
    incoming_price_per_base_unit_paise = incoming_price_per_base_unit * 100.0
    
    if old_avg_price is not None and old_qty > 0:
        new_avg = (old_avg_price * old_qty + incoming_price_per_base_unit_paise * incoming_qty) / (old_qty + incoming_qty)
    else:
        new_avg = incoming_price_per_base_unit_paise
        
    return int(round(new_avg))

def to_paise(rupees: float | None) -> int | None:
    """Safely converts a rupee amount to paise, handling None and rounding."""
    if rupees is None:
        return None
    return int(round(float(rupees) * 100))

def to_rupees(paise: int | float | None) -> float | None:
    """Safely converts a paise amount to rupees, handling None."""
    if paise is None:
        return None
    return float(paise) / 100.0

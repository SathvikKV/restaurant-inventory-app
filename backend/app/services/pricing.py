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

"""
Shared unit conversion and formatting utilities.
Standardizes weight quantities to grams (g) and volume quantities to millilitres (ml).
Count-based units pass through unchanged.
"""
import logging
from typing import Dict, Tuple

logger = logging.getLogger(__name__)

_UNIT_CACHE: Dict[str, Tuple[str, float]] = {}
_CACHE_INITIALIZED = False

class UnitConversionError(Exception):
    pass

PACKAGING_UNITS = {
    "bag", "bags", "sack", "sacks", "box", "boxes", "case", "cases", 
    "crate", "crates", "tin", "tins", "carton", "cartons", "drum", "drums",
    "pkt", "pkts", "packet", "packets"
}

async def init_unit_cache(session):
    from sqlalchemy import text
    global _UNIT_CACHE, _CACHE_INITIALIZED
    result = await session.execute(text("SELECT symbol, family, factor_to_base FROM public.units_of_measure"))
    new_cache = {}
    for row in result:
        new_cache[row[0].lower()] = (row[1], float(row[2]))
    _UNIT_CACHE = new_cache
    _CACHE_INITIALIZED = True
    logger.info(f"Unit cache populated with {len(_UNIT_CACHE)} units.")

def normalize_to_base(quantity: float, unit: str) -> tuple[float, str]:
    """Returns (quantity_in_base_unit, base_unit_name) — e.g. (500, 'g') for '0.5 kg'."""
    if not _CACHE_INITIALIZED:
        raise RuntimeError("unit cache not initialized - eager load failed")
    
    u = unit.strip().lower()
    if u in _UNIT_CACHE:
        family, factor = _UNIT_CACHE[u]
        if family == "weight":
            return quantity * factor, "g"
        elif family == "volume":
            return quantity * factor, "ml"
        else:
            return quantity, unit # count pass through unchanged
            
    if u in PACKAGING_UNITS:
        raise UnitConversionError(f"Packaging unit '{unit}' requires a known pack size")
    
    logger.warning(f"Unknown unit '{unit}' hit identity fallback in normalize_to_base")
    return quantity, unit

def to_display_pair(quantity: float, unit: str) -> tuple[float, str]:
    """Returns (display_quantity, display_unit) — e.g. (5.0, 'kg') for 5000g or (250, 'ml') for 250ml."""
    u = unit.strip().lower() if unit else ""
    if u == "g" and abs(quantity) >= 1000:
        return quantity / 1000, "kg"
    if u == "ml" and abs(quantity) >= 1000:
        return quantity / 1000, "L"
    return quantity, unit

def format_for_display(quantity: float, unit: str) -> str:
    """Converts a base-unit quantity back to a readable display string — e.g. 1500g -> '1.5 kg', 250ml -> '250 ml'."""
    if unit == "g":
        return f"{quantity/1000:.2f}".rstrip('0').rstrip('.') + " kg" if abs(quantity) >= 1000 else f"{quantity:.0f} g"
    if unit == "ml":
        return f"{quantity/1000:.2f}".rstrip('0').rstrip('.') + " L" if abs(quantity) >= 1000 else f"{quantity:.0f} ml"
    return f"{quantity:g} {unit}"

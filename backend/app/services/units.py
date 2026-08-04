"""
Shared unit conversion and formatting utilities.
Standardizes weight quantities to grams (g) and volume quantities to millilitres (ml).
Count-based units pass through unchanged.
"""

WEIGHT_UNITS = {"kg": 1000, "g": 1, "gram": 1, "grams": 1, "kilogram": 1000, "kilograms": 1000}
VOLUME_UNITS = {"litre": 1000, "liter": 1000, "l": 1000, "ml": 1, "millilitre": 1, "millilitres": 1}

def normalize_to_base(quantity: float, unit: str) -> tuple[float, str]:
    """Returns (quantity_in_base_unit, base_unit_name) — e.g. (500, 'g') for '0.5 kg'."""
    u = unit.strip().lower()
    if u in WEIGHT_UNITS:
        return quantity * WEIGHT_UNITS[u], "g"
    if u in VOLUME_UNITS:
        return quantity * VOLUME_UNITS[u], "ml"
    return quantity, unit  # count-based units pass through unchanged

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

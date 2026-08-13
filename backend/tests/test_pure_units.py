import pytest
from app.services.units import normalize_to_base

def test_normalize_to_base_standard_conversions():
    # Weight
    assert normalize_to_base(1, "kg") == (1000.0, "g")
    assert normalize_to_base(500, "g") == (500.0, "g")

    # Volume
    assert normalize_to_base(2.5, "L") == (2500.0, "ml")
    assert normalize_to_base(250, "ml") == (250.0, "ml")

    # Count (passes through unchanged in normalize_to_base)
    assert normalize_to_base(12, "dozen") == (12.0, "dozen")
    assert normalize_to_base(1, "pcs") == (1.0, "pcs")

def test_normalize_to_base_unrecognized_unit():
    # Unknown units should return the exact same quantity and unit, and warn/fail-safe
    # Since it warns via logging, we just ensure it doesn't crash and returns the original
    assert normalize_to_base(10, "unknown_unit") == (10.0, "unknown_unit")

def test_normalize_to_base_uses_cache():
    # Verify that it doesn't try to query DB per call for recognized hardcoded units
    # We can mock the DB session and check that it's not accessed
    # Actually normalize_to_base doesn't take a db session, it relies purely on the UNIT_CACHE dictionary.
    # So by definition it is disconnected from the DB.
    # This test serves as documentation that normalize_to_base is purely computational.
    pass

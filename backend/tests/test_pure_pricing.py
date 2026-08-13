import pytest
from app.services.pricing import update_moving_average_price, price_per_base_unit

def test_update_moving_average_price_uses_pre_increment_weight_bugfix():
    # Scenario: Brand new item (no previous avg price)
    # 5 kg bought at 100 Rs/kg -> unit_price=10000 paise
    new_avg = update_moving_average_price(
        old_avg_price=None,
        old_qty=0.0,
        incoming_unit_price=10000,
        incoming_purchase_unit="kg",
        incoming_qty=5000.0  # 5kg in base unit (grams)
    )
    # price per base unit = 10000 paise / 1000g = 10 paise per gram
    assert new_avg == 10

    # Scenario: Existing item with old average price
    # Old: 5000g at 10 paise/g. 
    # New Purchase: 5kg (5000g) at 200 Rs/kg -> unit_price=20000 paise -> 20 paise/g
    # If the bug was present (using post-increment qty as weight), the formula would do:
    # (10 * 10000 + 20 * 5000) / (10000 + 5000) = wrong.
    # The fix ensures we use old_qty exactly as the weight:
    # (10 * 5000 + 20 * 5000) / (5000 + 5000) = 15 paise/g
    
    updated_avg = update_moving_average_price(
        old_avg_price=10,
        old_qty=5000.0,  # Pre-increment qty
        incoming_unit_price=20000,
        incoming_purchase_unit="kg",
        incoming_qty=5000.0
    )
    assert updated_avg == 15

def test_price_per_base_unit_kg_to_gram_bugfix():
    # Scenario: The 1000x pricing bug where a unit mismatch resulted in huge prices
    # If we buy 1 "kg" for 100 Rs (10000 paise), the base unit is grams.
    # Price per gram should be 10000 / 1000 = 10 paise
    assert price_per_base_unit(10000, "kg") == 10.0
    
    # If we buy 1 "g" for 10 paise, price per base unit is 10 paise
    assert price_per_base_unit(10, "g") == 10.0

    # If we buy 1 "L" for 50 Rs (5000 paise), base unit is ml
    assert price_per_base_unit(5000, "L") == 5.0
    
    # If we buy 1 "count" (pcs) for 20 Rs (2000 paise)
    assert price_per_base_unit(2000, "pcs") == 2000.0

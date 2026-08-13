import pytest
from app.services.matching import hard_number_unit_gate, match_pipeline, GateEvaluationError

def test_hard_number_unit_gate_kg_vs_g_bugfix():
    # Scenario: Same physical amount but different units should pass.
    assert hard_number_unit_gate("All Purpose Flour 1kg", "All Purpose Flour 1000g") is True

    # Scenario: Different physical amounts should fail (conflict).
    assert hard_number_unit_gate("Onions 5kg", "Onions 500g") is False

    # Scenario: Fallback behavior on exception.
    # It must raise GateEvaluationError.
    from unittest import mock
    with mock.patch("app.services.units.normalize_to_base", side_effect=Exception("Simulated crash")):
        with pytest.raises(GateEvaluationError):
            hard_number_unit_gate("Weird Item 1weirdunit", "Weird Item 1weirdunit")

@pytest.mark.asyncio
async def test_match_pipeline_gate_exception_routes_to_review():
    from unittest import mock
    
    class MockItem:
        def __init__(self, item_name):
            self.id = 1
            self.item = item_name
            self.unit = "pcs"
            self.embedding = [0.1] * 1536
            
    existing = [MockItem("Weird Item 1weirdunit")]
    
    with mock.patch("app.services.units.normalize_to_base", side_effect=Exception("Simulated crash")):
        with mock.patch("app.services.matching.get_top_candidates", return_value=[(existing[0], 0.9)]):
            res = await match_pipeline("Weird Item 1weirdunit", 1.0, "weirdunit", existing)
            assert res["status"] == "needs_review"
            assert "internal error" in res["reason"]

@pytest.mark.asyncio
async def test_match_pipeline_genuine_conflict_routes_to_new():
    from unittest import mock
    
    class MockItem:
        def __init__(self, item_name):
            self.id = 1
            self.item = item_name
            self.unit = "kg"
            self.embedding = [0.1] * 1536
            
    existing = [MockItem("Onions 5kg")]
    
    # Genuine conflict (5kg vs 500g) will return False from the hard gate cleanly.
    # No exception occurs. The candidate pool empties out.
    with mock.patch("app.services.matching.get_top_candidates", return_value=[(existing[0], 0.9)]):
        res = await match_pipeline("Onions 500g", 0.5, "kg", existing)
        assert res["status"] == "new"

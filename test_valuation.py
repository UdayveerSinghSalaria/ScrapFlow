"""Arithmetic regression tests for the deterministic value estimator."""
import unittest
from datetime import datetime, timezone

from fastapi.testclient import TestClient
from main import app
from models import Classification, ValueEstimateRequest
from valuation import build_lot_summary, estimate_value


def estimate(material: str, grade: str, weight: float, contamination: int, logistics: float):
    classification = Classification(
        material=material, grade=grade, confidence=0.9,
        contamination_percent=contamination, reason="Test classification.",
        manual_verification_required=False,
    )
    return estimate_value(ValueEstimateRequest(
        classification=classification, weight_kg=weight, logistics_cost=logistics,
    ))


class ValuationFormulaTests(unittest.TestCase):
    def test_clean_aluminium(self):
        result = estimate("Aluminium", "Clean Extrusion", 250, 5, 1500)
        self.assertEqual(result.gross_value, 38010.00)
        self.assertEqual(result.contamination_deduction, 1900.50)
        self.assertEqual(result.net_value, 34609.50)

    def test_clean_copper(self):
        result = estimate("Copper", "Clean Wire", 100, 2, 500)
        self.assertEqual(result.gross_value, 61703.00)
        self.assertEqual(result.net_value, 59968.94)

    def test_hms2_steel_grade_factor(self):
        result = estimate("Steel", "HMS 2", 1000, 10, 1000)
        self.assertEqual(result.grade_factor, 0.9)
        self.assertEqual(result.gross_value, 35307.00)
        self.assertEqual(result.net_value, 30776.30)

    def test_brass_fittings(self):
        result = estimate("Brass", "Brass Fittings", 200, 5, 500)
        self.assertEqual(result.gross_value, 76219.20)
        self.assertEqual(result.net_value, 71908.24)

    def test_pet_plastic(self):
        result = estimate("Plastic", "PET", 500, 15, 300)
        self.assertEqual(result.gross_value, 7395.00)
        self.assertEqual(result.net_value, 5985.75)

    def test_industrial_buyer_adjustment_changes_effective_rate(self):
        result = estimate_value(ValueEstimateRequest(
            classification=Classification(material="Steel", grade="HMS 1", confidence=0.9,
                                          contamination_percent=0, reason="Test.", manual_verification_required=False),
            weight_kg=100, logistics_cost=0, buyer_category="industrial",
        ))
        self.assertEqual(result.buyer_multiplier, 1.15)
        self.assertEqual(result.effective_rate_per_kg, 45.11)
        self.assertEqual(result.gross_value, 4511.45)

    def test_material_default_logistics_is_used_when_not_supplied(self):
        result = estimate_value(ValueEstimateRequest(
            classification=Classification(material="Aluminium", grade="Clean Extrusion", confidence=0.9,
                                          contamination_percent=0, reason="Test.", manual_verification_required=False),
            weight_kg=10,
        ))
        self.assertEqual(result.logistics_cost_per_kg, 0.15)
        self.assertEqual(result.logistics_cost, 1.50)
        self.assertEqual(result.net_value, 1518.90)

    def test_explicit_total_logistics_takes_precedence(self):
        result = estimate_value(ValueEstimateRequest(
            classification=Classification(material="Aluminium", grade="Clean Extrusion", confidence=0.9,
                                          contamination_percent=0, reason="Test.", manual_verification_required=False),
            weight_kg=10, logistics_cost=0, logistics_cost_per_kg=99,
        ))
        self.assertEqual(result.logistics_cost, 0)
        self.assertEqual(result.logistics_cost_per_kg, 0)

    def test_net_value_cannot_be_negative(self):
        result = estimate_value(ValueEstimateRequest(
            classification=Classification(material="Steel", grade="HMS 1", confidence=0.9,
                                          contamination_percent=100, reason="Test.", manual_verification_required=False),
            weight_kg=1, logistics_cost=100,
        ))
        self.assertEqual(result.net_value, 0)

    def test_lot_summary_has_deterministic_id_mixed_value_and_recovery(self):
        request = ValueEstimateRequest(
            classification=Classification(material="Aluminium", grade="Clean Extrusion", confidence=0.9,
                                          contamination_percent=0, reason="Test.", manual_verification_required=False),
            weight_kg=100, logistics_cost=0,
        )
        summary = build_lot_summary(
            request,
            created_at=datetime(2026, 9, 20, 10, 30, 0, tzinfo=timezone.utc),
            suffix="AB12",
        )
        self.assertEqual(summary.lot_id, "LOT-20260920103000-ALU-DOM-AB12")
        self.assertEqual(summary.mixed_lot_value, 11859.12)
        self.assertEqual(summary.potential_recovery, 1824.48)
        self.assertFalse(summary.recovery_is_settlement_value)

    def test_existing_estimate_endpoint_payload_remains_valid(self):
        client = TestClient(app)
        response = client.post("/estimate-value", json={
            "classification": {
                "material": "Aluminium", "grade": "Clean Extrusion", "confidence": 0.85,
                "contamination_percent": 5, "reason": "Test.", "manual_verification_required": False,
            },
            "weight_kg": 250, "logistics_cost": 1500,
        })
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["net_value"], 34609.5)


if __name__ == "__main__":
    unittest.main()

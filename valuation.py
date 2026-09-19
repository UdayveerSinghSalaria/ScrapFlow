"""Deterministic scrap-value calculations.

The rates are intentionally explicit, dated reference values.  They are not a
live market feed and callers can supply their buyer's agreed base rate instead.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
import random

from models import Classification, LotSummary, ValueEstimate, ValueEstimateRequest

RATE_DATE = "2026-09-19"
RATE_SOURCE = "https://scraprates.in/chandigarh"


@dataclass(frozen=True)
class MarketRate:
    inr_per_kg: float
    reference_name: str


@dataclass(frozen=True)
class MaterialPricingConfig:
    market_rate: MarketRate
    buyer_multipliers: dict[str, float]
    default_logistics_cost_per_kg: float
    mixed_rate_factor: float


# Chandigarh buying-rate benchmarks in INR/kg. These are estimates and must be
# replaced by a buyer quote before a commercial settlement.
MATERIAL_PRICING: dict[str, MaterialPricingConfig] = {
    "Iron": MaterialPricingConfig(MarketRate(35.00, "Conservative Chandigarh iron scrap benchmark"), {"domestic": 1.00, "export": 1.08, "industrial": 1.12}, 0.12, 0.80),
    "Steel": MaterialPricingConfig(MarketRate(39.23, "Chandigarh iron/steel scrap benchmark"), {"domestic": 1.00, "export": 1.08, "industrial": 1.15}, 0.12, 0.80),
    "Stainless Steel": MaterialPricingConfig(MarketRate(132.23, "Chandigarh stainless-steel scrap benchmark"), {"domestic": 1.00, "export": 1.08, "industrial": 1.15}, 0.18, 0.80),
    "Aluminium": MaterialPricingConfig(MarketRate(152.04, "Chandigarh aluminium scrap benchmark"), {"domestic": 1.00, "export": 1.12, "industrial": 1.18}, 0.15, 0.78),
    "Copper": MaterialPricingConfig(MarketRate(617.03, "Chandigarh copper scrap benchmark"), {"domestic": 1.00, "export": 1.10, "industrial": 1.20}, 0.25, 0.80),
    "Brass": MaterialPricingConfig(MarketRate(423.44, "Chandigarh brass scrap benchmark"), {"domestic": 1.00, "export": 1.10, "industrial": 1.20}, 0.20, 0.80),
    "Plastic": MaterialPricingConfig(MarketRate(14.79, "Chandigarh mixed-plastic scrap benchmark"), {"domestic": 1.00, "export": 1.05, "industrial": 1.12}, 0.10, 0.70),
    "Mixed Scrap": MaterialPricingConfig(MarketRate(20.00, "Conservative mixed-scrap estimate"), {"domestic": 1.00, "export": 1.05, "industrial": 1.12}, 0.18, 1.00),
}

GRADE_FACTORS: dict[str, dict[str, float]] = {
    "Steel": {"HMS 1": 1.00, "HMS 2": 0.90, "Light/Mixed Steel": 0.80, "Shredded Steel": 0.95, "Steel Turnings": 0.70},
    "Stainless Steel": {"Clean Stainless": 1.00, "Mixed Stainless": 0.80, "304/316 grade": 0.95},
    "Aluminium": {"Clean Extrusion": 1.00, "Mixed Aluminium": 0.78, "Aluminium Cans": 0.55, "Cast Aluminium": 0.85, "Foil": 0.35},
    "Copper": {"Clean Wire": 1.00, "Insulated Wire": 0.72, "Mixed Copper": 0.80, "Copper Pipe": 0.92, "Burnt Wire": 0.60},
    "Brass": {"Clean Brass": 1.00, "Mixed Brass": 0.80, "Brass Fittings": 0.90, "Low-Grade Brass": 0.65},
    "Plastic": {"HDPE": 1.20, "LDPE": 1.10, "PET": 1.00, "Mixed Plastic": 0.70, "PVC": 0.65, "Plastic Film": 0.60},
    "Mixed Scrap": {"General Mixed": 0.70, "Pre-Sorted Mixed": 0.85, "Post-Consumer Mixed": 0.60, "Unknown": 0.50},
}


def _resolve_logistics(request: ValueEstimateRequest, config: MaterialPricingConfig) -> tuple[float, float]:
    """Return the total logistics cost and the effective per-kg rate."""
    if request.logistics_cost is not None:
        return request.logistics_cost, request.logistics_cost / request.weight_kg
    per_kg = (request.logistics_cost_per_kg if request.logistics_cost_per_kg is not None
              else config.default_logistics_cost_per_kg)
    return request.weight_kg * per_kg, per_kg


def _value_inputs(request: ValueEstimateRequest) -> tuple[MaterialPricingConfig, float, float, float, float, float, float]:
    classification: Classification = request.classification
    config = MATERIAL_PRICING[classification.material]
    base_rate = request.base_rate_per_kg if request.base_rate_per_kg is not None else config.market_rate.inr_per_kg
    grade_factor = request.grade_factor if request.grade_factor is not None else GRADE_FACTORS[classification.material].get(classification.grade, 0.70)
    buyer_multiplier = config.buyer_multipliers[request.buyer_category]
    logistics_total, logistics_per_kg = _resolve_logistics(request, config)
    return config, base_rate, grade_factor, buyer_multiplier, logistics_total, logistics_per_kg, base_rate * buyer_multiplier * grade_factor


def estimate_value(request: ValueEstimateRequest) -> ValueEstimate:
    classification: Classification = request.classification
    config, base_rate, grade_factor, buyer_multiplier, logistics_total, logistics_per_kg, effective_rate = _value_inputs(request)

    # Gross = weight × base rate × buyer multiplier × grade factor
    gross = request.weight_kg * effective_rate
    contamination_deduction = gross * (classification.contamination_percent / 100)
    # Net = gross × (1 − contamination %) − logistics
    net = max(gross - contamination_deduction - logistics_total, 0)

    return ValueEstimate(
        currency="INR",
        estimated_composition={
            "primary_material": classification.material,
            "primary_material_percent": 100 - classification.contamination_percent,
            "contamination_percent": classification.contamination_percent,
            "basis": "Visual estimate from classification; not a chemical assay.",
        },
        base_rate_per_kg=round(base_rate, 2),
        grade_factor=round(grade_factor, 3),
        buyer_category=request.buyer_category,
        buyer_multiplier=round(buyer_multiplier, 3),
        effective_rate_per_kg=round(effective_rate, 2),
        gross_value=round(gross, 2),
        contamination_deduction=round(contamination_deduction, 2),
        logistics_cost=round(logistics_total, 2),
        logistics_cost_per_kg=round(logistics_per_kg, 4),
        net_value=round(net, 2),
        price_reference=config.market_rate.reference_name if request.base_rate_per_kg is None else "Caller-provided buyer base rate",
        price_as_of=RATE_DATE if request.base_rate_per_kg is None else None,
        price_source_url=RATE_SOURCE if request.base_rate_per_kg is None else None,
        is_estimate=True,
    )


def generate_lot_id(material_name: str, buyer_category: str, *, created_at: datetime | None = None, suffix: str | None = None) -> str:
    timestamp = (created_at or datetime.now(timezone.utc)).strftime("%Y%m%d%H%M%S")
    material_code = material_name.strip()[:3].upper()
    buyer_code = buyer_category.strip()[:3].upper()
    random_part = suffix or f"{random.randint(1000, 9999):04d}"
    return f"LOT-{timestamp}-{material_code}-{buyer_code}-{random_part}"


def build_lot_summary(request: ValueEstimateRequest, *, created_at: datetime | None = None, suffix: str | None = None) -> LotSummary:
    estimate = estimate_value(request)
    config, _, _, _, _, _, _ = _value_inputs(request)
    mixed_rate = (request.mixed_rate_per_kg if request.mixed_rate_per_kg is not None
                  else config.market_rate.inr_per_kg * config.mixed_rate_factor)
    mixed_lot_value = request.weight_kg * mixed_rate
    potential_recovery = max(estimate.net_value, mixed_lot_value) * request.recovery_factor
    now = created_at or datetime.now(timezone.utc)
    return LotSummary(
        **estimate.model_dump(),
        lot_id=generate_lot_id(request.classification.material, request.buyer_category, created_at=now, suffix=suffix),
        created_at=now.isoformat(),
        mixed_lot_value=round(mixed_lot_value, 2),
        recovery_factor=request.recovery_factor,
        potential_recovery=round(potential_recovery, 2),
    )

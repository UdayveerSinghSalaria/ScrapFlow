"""Deterministic sample classifications used when no AI provider is configured."""
from __future__ import annotations

from models import Classification


FALLBACK_DATA: dict[str, dict] = {
    "aluminium_sample": {
        "material": "Aluminium",
        "grade": "Clean Extrusion",
        "confidence": 0.86,
        "contamination_percent": 5,
        "reason": "Representative clean aluminium extrusion sample.",
        "manual_verification_required": False,
        "composition": [{"material": "Aluminium", "percentage": 100, "grade": "Clean Extrusion", "confidence": 0.86}],
    },
    "copper_sample": {
        "material": "Copper",
        "grade": "Clean Wire",
        "confidence": 0.91,
        "contamination_percent": 2,
        "reason": "Representative clean copper wire sample.",
        "manual_verification_required": False,
        "composition": [{"material": "Copper", "percentage": 100, "grade": "Clean Wire", "confidence": 0.91}],
    },
    "steel_sample": {
        "material": "Steel",
        "grade": "HMS 1",
        "confidence": 0.82,
        "contamination_percent": 8,
        "reason": "Representative heavy steel scrap sample.",
        "manual_verification_required": False,
        "composition": [{"material": "Steel", "percentage": 100, "grade": "HMS 1", "confidence": 0.82}],
    },
    "mixed_sample": {
        "material": "Mixed Scrap",
        "grade": "General Mixed",
        "confidence": 0.42,
        "contamination_percent": 35,
        "reason": "Multiple visible material types require manual sorting.",
        "manual_verification_required": True,
        "composition": [{"material": "Mixed Scrap", "percentage": 100, "grade": "General Mixed", "confidence": 0.42}],
    },
}


UNKNOWN_FALLBACK = Classification(
    material="Mixed Scrap",
    grade="Unknown",
    confidence=0.0,
    contamination_percent=100,
    reason="No deterministic sample matched and AI classification was unavailable.",
    manual_verification_required=True,
    composition=[{"material": "Mixed Scrap", "percentage": 100, "grade": "Unknown", "confidence": 0.0}],
)


def fallback_for_url(url: str) -> Classification:
    lowered = url.lower()
    for sample_id, result in FALLBACK_DATA.items():
        if sample_id in lowered:
            return Classification.model_validate(result)
    return UNKNOWN_FALLBACK

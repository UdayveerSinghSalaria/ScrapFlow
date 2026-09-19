"""Pydantic request and response contracts for the API."""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, HttpUrl, model_validator

Material = Literal["Iron", "Steel", "Stainless Steel", "Aluminium", "Copper", "Brass", "Plastic", "Mixed Scrap"]
BuyerCategory = Literal["domestic", "export", "industrial"]


class ClassifyRequest(BaseModel):
    image_url: HttpUrl | None = None
    image_base64: str | None = Field(default=None, min_length=1)
    material_hint: str | None = Field(default=None, max_length=100)
    weight_kg: float | None = Field(default=None, ge=0)
    location: str | None = Field(default=None, max_length=200)
    notes: str | None = Field(default=None, max_length=1000)

    @model_validator(mode="after")
    def exactly_one_image(self) -> "ClassifyRequest":
        if (self.image_url is None) == (self.image_base64 is None):
            raise ValueError("Provide exactly one of image_url or image_base64.")
        return self


class CompositionComponent(BaseModel):
    material: Material
    percentage: float = Field(ge=0, le=100)
    grade: str = Field(min_length=1, max_length=100)
    confidence: float = Field(ge=0.0, le=1.0)


class Classification(BaseModel):
    material: Material
    grade: str = Field(min_length=1, max_length=100)
    confidence: float = Field(ge=0.0, le=1.0)
    contamination_percent: int = Field(ge=0, le=100)
    reason: str = Field(min_length=1, max_length=600)
    manual_verification_required: bool
    composition: list[CompositionComponent] = Field(default_factory=list)

    @model_validator(mode="after")
    def ensure_composition(self) -> "Classification":
        if not self.composition:
            self.composition = [CompositionComponent(
                material=self.material,
                percentage=100.0,
                grade=self.grade,
                confidence=self.confidence,
            )]
        return self


class ClassificationSuccess(BaseModel):
    success: Literal[True] = True
    classification: Classification
    source: Literal["ai", "fallback", "rule"]
    model_used: str
    processing_time_ms: int = Field(ge=0)


class ClassificationError(BaseModel):
    success: Literal[False] = False
    error: str
    error_code: Literal["CLASSIFICATION_FAILED"] = "CLASSIFICATION_FAILED"
    fallback_available: bool
    fallback: Classification


class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"
    ai_provider: str
    ai_configured: bool
    fallback_enabled: bool


class FallbackResponse(BaseModel):
    sample_id: str
    classification: Classification


class ValueEstimateRequest(BaseModel):
    """Inputs for the deterministic value calculation."""
    classification: Classification
    weight_kg: float = Field(gt=0)
    # `None` is distinct from zero: an explicit zero disables logistics while
    # an omitted value selects a supplied or material-default per-kg rate.
    logistics_cost: float | None = Field(default=None, ge=0)
    base_rate_per_kg: float | None = Field(default=None, gt=0)
    grade_factor: float | None = Field(default=None, gt=0)
    buyer_category: BuyerCategory = "domestic"
    logistics_cost_per_kg: float | None = Field(default=None, ge=0)
    mixed_rate_per_kg: float | None = Field(default=None, ge=0)
    recovery_factor: float = Field(default=0.12, ge=0)


class EstimatedComposition(BaseModel):
    primary_material: Material
    primary_material_percent: int = Field(ge=0, le=100)
    contamination_percent: int = Field(ge=0, le=100)
    basis: str


class ValueEstimate(BaseModel):
    currency: Literal["INR"]
    estimated_composition: EstimatedComposition
    base_rate_per_kg: float = Field(gt=0)
    grade_factor: float = Field(gt=0)
    buyer_category: BuyerCategory
    buyer_multiplier: float = Field(gt=0)
    effective_rate_per_kg: float = Field(gt=0)
    gross_value: float
    contamination_deduction: float = Field(ge=0)
    logistics_cost: float = Field(ge=0)
    logistics_cost_per_kg: float = Field(ge=0)
    net_value: float
    price_reference: str
    price_as_of: str | None
    price_source_url: str | None
    is_estimate: Literal[True] = True


class LotSummary(ValueEstimate):
    lot_id: str
    created_at: str
    mixed_lot_value: float = Field(ge=0)
    recovery_factor: float = Field(ge=0)
    potential_recovery: float = Field(ge=0)
    recovery_is_settlement_value: Literal[False] = False

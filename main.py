"""FastAPI entry point for the scrap material classifier."""
from __future__ import annotations

import base64

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from classifier import classify
from config import settings
from fallback import FALLBACK_DATA
from models import (Classification, ClassificationError, ClassificationSuccess,
                    ClassifyRequest, FallbackResponse, HealthResponse,
                    LotSummary, ValueEstimate, ValueEstimateRequest)
from valuation import build_lot_summary, estimate_value

app = FastAPI(title="Scrap Material Classifier", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(
        ai_provider=settings.ai_provider,
        ai_configured=bool(
            settings.gemini_api_key if settings.ai_provider == "gemini"
            else settings.openai_api_key
        ),
        fallback_enabled=settings.fallback_enabled,
    )


@app.post("/classify", response_model=ClassificationSuccess | ClassificationError)
async def classify_image(request: ClassifyRequest) -> ClassificationSuccess | ClassificationError:
    return await classify(request)


@app.post("/classify/upload", response_model=ClassificationSuccess | ClassificationError)
async def classify_uploaded_image(
    image: UploadFile = File(..., description="JPG, PNG, WebP, or GIF scrap photo"),
    material_hint: str | None = Form(default=None),
    weight_kg: float | None = Form(default=None),
    location: str | None = Form(default=None),
    notes: str | None = Form(default=None),
) -> ClassificationSuccess | ClassificationError:
    """Classify a directly uploaded scrap image (maximum 10 MiB)."""
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(status_code=415, detail="Upload an image file.")
    raw_image = await image.read()
    if not raw_image:
        raise HTTPException(status_code=422, detail="The uploaded image is empty.")
    if len(raw_image) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Image must be 10 MiB or smaller.")
    encoded_image = base64.b64encode(raw_image).decode("ascii")
    request = ClassifyRequest(
        image_base64=f"data:{image.content_type};base64,{encoded_image}",
        material_hint=material_hint,
        weight_kg=weight_kg,
        location=location,
        notes=notes,
    )
    return await classify(request)


@app.get("/fallback/{sample_id}", response_model=FallbackResponse)
async def fallback_sample(sample_id: str) -> FallbackResponse:
    result = FALLBACK_DATA.get(sample_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Unknown fallback sample id")
    return FallbackResponse(sample_id=sample_id, classification=Classification.model_validate(result))


@app.post("/estimate-value", response_model=ValueEstimate)
async def estimate_scrap_value(request: ValueEstimateRequest) -> ValueEstimate:
    """Calculate an INR estimate from an existing classification and lot inputs."""
    return estimate_value(request)


@app.post("/lot-summary", response_model=LotSummary)
async def create_lot_summary(request: ValueEstimateRequest) -> LotSummary:
    """Create a traceable lot estimate with separate mixed-lot and recovery metrics."""
    return build_lot_summary(request)

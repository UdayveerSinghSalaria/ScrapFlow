"""AI-backed classification with deterministic fallback behavior."""
from __future__ import annotations

import json
import time
import base64
import re
from urllib.error import HTTPError
from urllib import request as url_request

from config import settings
from fallback import fallback_for_url, UNKNOWN_FALLBACK
from models import Classification, ClassificationError, ClassificationSuccess, ClassifyRequest


ALLOWED_MATERIALS = {"Iron", "Steel", "Stainless Steel", "Aluminium", "Copper", "Brass", "Plastic", "Mixed Scrap"}


def _classify_from_hint(hint: str | None) -> Classification | None:
    if not hint:
        return None
    normalized = hint.strip().lower()
    for material in ALLOWED_MATERIALS:
        if material.lower() in normalized:
            return Classification(
                material=material,
                grade="Unknown",
                confidence=0.35,
                contamination_percent=25,
                reason="Rule-based result from the supplied material hint; verify physically.",
                manual_verification_required=True,
            )
    return None


def _prompt(request: ClassifyRequest) -> str:
    return (
        "Classify this scrap-metal image. Return ONLY valid JSON with keys "
        "material, grade, confidence, contamination_percent, reason, "
        "manual_verification_required, composition. The top-level material is "
        "the dominant material. For mixed scrap, composition must list every "
        "visible material with material, percentage, grade, and confidence; "
        "percentages must sum to 100. Report Iron separately from Steel. "
        "Never claim chemical certainty from an image. "
        f"Allowed materials: {', '.join(sorted(ALLOWED_MATERIALS))}. "
        f"Hint: {request.material_hint or 'none'}. Notes: {request.notes or 'none'}."
    )


def _validate_provider_result(content: str | dict) -> Classification:
    if isinstance(content, str):
        content = re.sub(r"^```(?:json)?\s*|\s*```$", "", content.strip(), flags=re.IGNORECASE)
        parsed = json.loads(content)
    else:
        parsed = content
    result = Classification.model_validate(parsed)
    if result.material not in ALLOWED_MATERIALS:
        raise ValueError("Provider returned an unsupported material.")
    if abs(sum(item.percentage for item in result.composition) - 100) > 1:
        raise ValueError("Provider composition percentages must sum to 100.")
    if result.confidence < 0.5:
        result.manual_verification_required = True
    return result


def _image_parts(request: ClassifyRequest) -> tuple[str, str]:
    image = str(request.image_url) if request.image_url else request.image_base64
    if request.image_base64:
        header, encoded = request.image_base64.split(",", 1)
        return header.split(";", 1)[0].replace("data:", ""), encoded
    with url_request.urlopen(image, timeout=settings.classification_timeout) as response:
        mime = response.headers.get_content_type() or "image/jpeg"
        return mime, base64.b64encode(response.read()).decode("ascii")


def _openai_classification(request: ClassifyRequest) -> Classification:
    if not settings.openai_api_key:
        raise RuntimeError("OPENAI_API_KEY is not configured.")
    image = str(request.image_url) if request.image_url else request.image_base64
    prompt = (
        "Classify this scrap material. Return only JSON with keys material, grade, "
        "confidence, contamination_percent, reason, manual_verification_required, "
        "composition. For mixed scrap, composition must be an array of every visible "
        "material with material, percentage, grade, and confidence; percentages must "
        "sum to 100. Report Iron separately from Steel. "
        f"Allowed materials: {', '.join(sorted(ALLOWED_MATERIALS))}. "
        f"Hint: {request.material_hint or 'none'}. Notes: {request.notes or 'none'}."
    )
    payload = {
        "model": settings.openai_model,
        "response_format": {"type": "json_object"},
        "messages": [{
            "role": "user",
            "content": [
                {"type": "text", "text": prompt},
                {"type": "image_url", "image_url": {"url": image}},
            ],
        }],
        "max_tokens": 300,
    }
    req = url_request.Request(
        "https://api.openai.com/v1/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {settings.openai_api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with url_request.urlopen(req, timeout=settings.classification_timeout) as response:
        body = json.loads(response.read().decode("utf-8"))
    content = body["choices"][0]["message"]["content"]
    parsed = json.loads(content) if isinstance(content, str) else content
    return _validate_provider_result(parsed)


def _gemini_classification(request: ClassifyRequest) -> Classification:
    if not settings.gemini_api_key:
        raise RuntimeError("GEMINI_API_KEY is not configured.")
    mime_type, encoded_image = _image_parts(request)
    payload = {
        "contents": [{
            "parts": [
                {"text": _prompt(request)},
                {"inline_data": {"mime_type": mime_type, "data": encoded_image}},
            ],
        }],
        "generationConfig": {
            "temperature": 0.1,
            "responseMimeType": "application/json",
        },
    }
    models = [settings.gemini_model]
    for fallback_model in ("gemini-flash-latest", "gemini-3.6-flash", "gemini-2.5-flash", "gemini-2.0-flash"):
        if fallback_model not in models:
            models.append(fallback_model)
    body = None
    last_error: HTTPError | None = None
    for model in models:
        endpoint = (
            f"https://generativelanguage.googleapis.com/v1beta/models/"
            f"{model}:generateContent?key={settings.gemini_api_key}"
        )
        req = url_request.Request(
            endpoint,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        for attempt in range(3):
            try:
                with url_request.urlopen(req, timeout=settings.classification_timeout) as response:
                    body = json.loads(response.read().decode("utf-8"))
                last_error = None
                break
            except HTTPError as error:
                if error.code == 404 and model != models[-1]:
                    break
                if error.code in (429, 500, 502, 503, 504) and attempt < 2:
                    retry_after = error.headers.get("Retry-After")
                    try:
                        delay = max(1.0, float(retry_after)) if retry_after else 2 ** attempt
                    except ValueError:
                        delay = 2 ** attempt
                    time.sleep(delay)
                    last_error = error
                    continue
                last_error = error
                break
        if body is not None:
            break
        if last_error is not None and last_error.code not in (429, 500, 502, 503, 504):
            raise last_error
    if body is None:
        if last_error is not None:
            raise RuntimeError(
                f"Gemini temporarily unavailable after trying {len(models)} models "
                f"(HTTP {last_error.code}). Please retry shortly."
            ) from last_error
        raise RuntimeError("Gemini did not return a response.")
    content = body["candidates"][0]["content"]["parts"][0]["text"]
    return _validate_provider_result(content)


def _provider_classification(request: ClassifyRequest) -> Classification:
    if settings.ai_provider == "gemini":
        return _gemini_classification(request)
    return _openai_classification(request)


async def classify(request: ClassifyRequest) -> ClassificationSuccess | ClassificationError:
    started = time.perf_counter()
    try:
        if request.image_url:
            provider_configured = bool(
                settings.gemini_api_key if settings.ai_provider == "gemini"
                else settings.openai_api_key
            )
            if not provider_configured:
                result = fallback_for_url(str(request.image_url))
                source = "rule" if result is UNKNOWN_FALLBACK else "fallback"
            else:
                result = _provider_classification(request)
                source = "ai"
        elif request.image_base64:
            provider_configured = bool(
                settings.gemini_api_key if settings.ai_provider == "gemini"
                else settings.openai_api_key
            )
            if request.image_base64.startswith("data:image/") and provider_configured:
                result = _provider_classification(request)
                source = "ai"
            else:
                result = _classify_from_hint(request.material_hint) or UNKNOWN_FALLBACK
                source = "rule" if request.material_hint else "fallback"
        else:
            raise ValueError("An image input is required.")
        return ClassificationSuccess(
            classification=result,
            source=source,
            model_used=(
                settings.gemini_model if settings.ai_provider == "gemini"
                else settings.openai_model
            ) if source == "ai" else "deterministic-fallback",
            processing_time_ms=round((time.perf_counter() - started) * 1000),
        )
    except Exception as exc:
        return ClassificationError(
            error=f"Classification failed: {exc}",
            fallback_available=settings.fallback_enabled,
            fallback=UNKNOWN_FALLBACK,
        )

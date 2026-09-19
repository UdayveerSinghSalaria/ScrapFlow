# Classifier Module — Task Specification

**Assignee:** AI/ML Teammate
**Module:** Scrap Material Classifier
**Deadline:** Hackathon Day 1

---

## 1. Objective

Build a Python service that accepts a scrap image + batch metadata and returns a structured classification result. This is the **only AI-dependent module** — everything else (pricing, buyer routing, lot summary) is deterministic and handled by the frontend team.

---

## 2. Architecture Context

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  React App  │────▶│  Classifier API  │────▶│  Vision LLM API │
│  (frontend) │◀────│  (your service)  │◀────│  (GPT-4V/Gemini)│
└─────────────┘     └──────────────────┘     └─────────────────┘
                            │
                            ▼
                    ┌──────────────────┐
                    │  Fallback Mode   │
                    │  (no API key)    │
                    └──────────────────┘
```

**You own:** The Classifier API (Python service)
**Frontend team owns:** React app, pricing engine, buyer routing, lot summary, UI

---

## 3. Input Contract

Your classifier receives a JSON request:

```json
{
  "image_url": "https://example.com/scrap.jpg",
  "image_base64": "data:image/jpeg;base64,...",
  "material_hint": "Aluminium",
  "weight_kg": 250,
  "location": "Chandigarh",
  "notes": "Clean extrusion scraps"
}
```

- Either `image_url` or `image_base64` (never both)
- `material_hint` is optional
- Other fields are for AI context only — do NOT use in classification logic

---

## 4. Output Contract (MANDATORY RETURN)

```json
{
  "success": true,
  "classification": {
    "material": "Aluminium",
    "grade": "Clean extrusion",
    "confidence": 0.86,
    "contamination_percent": 5,
    "reason": "The image shows clean, light-coloured aluminium extrusion profiles with minimal visible mixed material or surface contamination.",
    "manual_verification_required": false
  },
  "source": "ai",
  "model_used": "gpt-4-vision-preview",
  "processing_time_ms": 1250
}
```

### Field Rules

| Field | Type | Rules |
|-------|------|-------|
| `material` | string | MUST be one of: `Steel`, `Stainless Steel`, `Aluminium`, `Copper`, `Brass`, `Plastic`, `Mixed Scrap` |
| `grade` | string | Free-form but from known grades (see Grade Reference) |
| `confidence` | float | 0.0–1.0 — based on image clarity AND material certainty |
| `contamination_percent` | integer | 0–100 — estimated visible mixed/wrong material |
| `reason` | string | 1–2 sentences, plain language, no chemical formulas |
| `manual_verification_required` | boolean | `true` if confidence < 0.60 |
| `source` | string | `"ai"` / `"fallback"` / `"rule"` |
| `model_used` | string | Which model handled this |
| `processing_time_ms` | integer | Classification duration |

### Error Response

```json
{
  "success": false,
  "error": "Image too blurry to classify",
  "error_code": "CLASSIFICATION_FAILED",
  "fallback_available": true,
  "fallback": {
    "material": "Mixed Scrap",
    "grade": "Unknown",
    "confidence": 0.0,
    "contamination_percent": 50,
    "reason": "Unable to classify image. Manual material selection required.",
    "manual_verification_required": true
  }
}
```

---

## 5. Grade Reference

| Material | Expected Grades |
|----------|----------------|
| Steel | HMS 1, HMS 2, Light/Mixed Steel, Shredded Steel, Steel Turnings |
| Stainless Steel | Clean Stainless, Mixed Stainless, 304/316 grade |
| Aluminium | Clean Extrusion, Mixed Aluminium, Aluminium Cans, Cast Aluminium, Foil |
| Copper | Clean Wire, Insulated Wire, Mixed Copper, Copper Pipe, Burnt Wire |
| Brass | Clean Brass, Mixed Brass, Brass Fittings, Low-Grade Brass |
| Plastic | HDPE, LDPE, PET, Mixed Plastic, PVC, Plastic Film |
| Mixed Scrap | General Mixed, Pre-Sorted Mixed, Post-Consumer Mixed |

---

## 6. Confidence Thresholds

| Confidence | Behavior |
|------------|----------|
| 0.80–1.00 | Standard result, green badge |
| 0.60–0.79 | Lower certainty, yellow badge, "Review recommended" |
| 0.00–0.59 | Red badge, "Clearer image or manual selection required" |
| API failure | Fallback mode, `source=fallback` |

---

## 7. AI Prompt Strategy

### System Prompt
```
You are a scrap material classifier for industrial recycling.
Given an image of scrap material, identify:

1. Material category (one of: Steel, Stainless Steel, Aluminium, Copper, Brass, Plastic, Mixed Scrap)
2. Grade within that category
3. Confidence level (0.0-1.0) based on image clarity
4. Estimated visible contamination percentage
5. Brief reasoning

RULES:
- Never claim chemical certainty from an image
- Never state live market prices
- If material is ambiguous, classify as "Mixed Scrap" with lower confidence
- Return ONLY valid JSON matching the required schema
```

### User Prompt
```
Classify this scrap material image.
${material_hint ? `Material hint: ${material_hint}` : 'No material hint.'}
${notes ? `Context: ${notes}` : ''}

Return JSON: material, grade, confidence, contamination_percent, reason, manual_verification_required
```

---

## 8. Fallback System (CRITICAL)

Pre-baked classifications for sample images:

```python
FALLBACK_DATA = {
    "aluminium_sample": {
        "material": "Aluminium",
        "grade": "Clean Extrusion",
        "confidence": 0.85,
        "contamination_percent": 5,
        "reason": "Sample classification: Clean aluminium extrusion scraps.",
        "manual_verification_required": False
    },
    "copper_sample": {
        "material": "Copper",
        "grade": "Clean Wire",
        "confidence": 0.80,
        "contamination_percent": 8,
        "reason": "Sample classification: Copper wire bundle with minor insulation.",
        "manual_verification_required": False
    },
    "steel_sample": {
        "material": "Steel",
        "grade": "HMS 1",
        "confidence": 0.82,
        "contamination_percent": 10,
        "reason": "Sample classification: Heavy melting steel scrap.",
        "manual_verification_required": False
    },
    "mixed_sample": {
        "material": "Mixed Scrap",
        "grade": "General Mixed",
        "confidence": 0.55,
        "contamination_percent": 30,
        "reason": "Sample classification: Mixed materials detected.",
        "manual_verification_required": True
    }
}
```

**Trigger fallback when:** No API key, API timeout (>5s), API error, unreadable image

---

## 9. Technical Requirements

### Project Structure
```
classifier/
├── main.py              # FastAPI app
├── classifier.py        # Core logic
├── prompts.py           # AI prompt templates
├── fallback.py          # Fallback data + logic
├── models.py            # Pydantic request/response models
├── config.py            # API key, model settings
├── requirements.txt
└── README.md
```

### Endpoints
- `POST /classify` — main classification
- `GET /health` — health check
- `GET /fallback/{sample_id}` — specific fallback data

**Start:** `uvicorn main:app --reload --port 8000`

---

## 10. Dependencies

```
fastapi>=0.104.0
uvicorn>=0.24.0
python-dotenv>=1.0.0
openai>=1.6.0
pydantic>=2.5.0
python-multipart>=0.0.6
```

---

## 11. Environment Variables

```env
CLASSIFIER_PORT=8000
AI_PROVIDER=openai
OPENAI_API_KEY=<your_openai_key>
GOOGLE_API_KEY=...
FALLBACK_ENABLED=true
CLASSIFICATION_TIMEOUT=5000
```

---

## 12. Deliverables Checklist

- [ ] Working FastAPI service on port 8000
- [ ] `POST /classify` returning exact JSON from Section 4
- [ ] Material validated against 7 supported categories
- [ ] Confidence thresholds implemented
- [ ] Fallback works without API key
- [ ] Error responses match Section 4 schema
- [ ] `.env.example` with all variables
- [ ] `requirements.txt` pinned
- [ ] README with setup instructions
- [ ] 5+ test classifications documented
- [ ] Processing time in response
- [ ] CORS enabled for `http://localhost:5173`

---

## 13. Integration Contract

Frontend calls your API like this:

```typescript
const response = await fetch('http://localhost:8000/classify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    image_base64: base64String,
    material_hint: selectedHint,
    weight_kg: 250,
    location: 'Chandigarh',
    notes: 'Clean extrusion scraps'
  })
});

const result = await response.json();
// result.classification.material → "Aluminium"
// result.classification.confidence → 0.86
```

---

## 14. Deliver After Completion

1. Running service URL (`http://localhost:8000`)
2. OpenAPI docs (`/docs`)
3. Sample responses for each material
4. Any schema changes (must agree with frontend team first)

# Scrap Material Classifier

FastAPI service that classifies a scrap image using Gemini or OpenAI vision, with deterministic demo fallback data when the provider is not configured or fails.

## Run

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn main:app --reload --port 8000
```

For Gemini, put the key in `.env`:

```env
AI_PROVIDER=gemini
GEMINI_API_KEY=<your_gemini_key>
GEMINI_MODEL=gemini-1.5-flash
CLASSIFICATION_TIMEOUT=30
```

The service is available at `http://localhost:8000`; interactive OpenAPI documentation is at `http://localhost:8000/docs`.

When used with the ScrapFlow frontend, start this service from the
`classifier` directory and set `VITE_CLASSIFIER_API_URL` in
`frontEnd/.env` if the API is not running at `http://127.0.0.1:8000`.

Set `AI_PROVIDER=gemini` and `GEMINI_API_KEY` for Gemini, or use `AI_PROVIDER=openai` with `OPENAI_API_KEY`. Without a configured provider, known sample URLs return pre-baked results and uploaded images return the safe fallback.

## API

`POST /classify` accepts exactly one of `image_url` or `image_base64`. `material_hint`, `weight_kg`, `location`, and `notes` are accepted as contextual metadata; only the hint and notes are passed to the AI prompt, and no metadata affects offline classification.

```json
{
  "image_url": "https://example.com/aluminium_sample.jpg",
  "material_hint": "Aluminium",
  "weight_kg": 250,
  "location": "Chandigarh",
  "notes": "Clean extrusion scraps"
}
```

For a photo file, use `POST /classify/upload` in `/docs`: choose the `image` file, optionally fill in the other form fields, then execute. JPG, PNG, WebP, and GIF image MIME types are accepted up to 10 MiB. This route converts the upload to the supported Base64 image input internally.

`GET /health` reports provider and fallback availability. `GET /fallback/{sample_id}` returns one of `aluminium_sample`, `copper_sample`, `steel_sample`, or `mixed_sample`.

## Value estimate

`POST /estimate-value` preserves the classifier contract and applies the following deterministic calculation in INR:

```text
Gross Value = Weight (kg) × Base Rate (₹/kg) × Grade Factor
Net Value = Gross Value × (1 − Contamination % / 100) − Logistics Cost
```

Pass the `classification` returned from `/classify`, the lot `weight_kg`, and an optional `logistics_cost`. The endpoint includes the image-derived recoverable share (`100 − contamination`) alongside the calculation. It is a visual estimate, not a chemical or laboratory composition report.

```json
{
  "classification": {
    "material": "Aluminium",
    "grade": "Clean Extrusion",
    "confidence": 0.85,
    "contamination_percent": 5,
    "reason": "Clean profiles with minor visible mixed material.",
    "manual_verification_required": false
  },
  "weight_kg": 250,
  "logistics_cost": 1500
}
```

The built-in base rates are Chandigarh benchmarks dated 2026-09-19 and are intentionally labelled estimates. Supply `base_rate_per_kg` and/or `grade_factor` in the request when you have an agreed buyer quote; these override the defaults. Do not use an estimate as a settlement price without a buyer quote and physical inspection.

### Enhanced lot pricing

`/estimate-value` also accepts optional `buyer_category` (`domestic`, `export`, or `industrial`), `logistics_cost_per_kg`, `mixed_rate_per_kg`, and `recovery_factor`. Buyer multipliers and per-kg logistics defaults are applied only when an explicit total `logistics_cost` is not provided. The response shows the base rate, buyer multiplier, effective rate, and resolved logistics inputs.

`POST /lot-summary` accepts the same payload and returns a traceable `LOT-...` ID, mixed-lot value, and `potential_recovery`. Recovery is a separate planning figure and is never added to `net_value`.

Run the formula regression checks with:

```powershell
python -m unittest discover -s tests -v
```

## Demo classifications

These calls work with no API key and document five representative outcomes:

```powershell
curl.exe -X POST http://localhost:8000/classify -H "Content-Type: application/json" -d '{"image_url":"https://example.com/aluminium_sample.jpg"}'
curl.exe -X POST http://localhost:8000/classify -H "Content-Type: application/json" -d '{"image_url":"https://example.com/copper_sample.jpg"}'
curl.exe -X POST http://localhost:8000/classify -H "Content-Type: application/json" -d '{"image_url":"https://example.com/steel_sample.jpg"}'
curl.exe -X POST http://localhost:8000/classify -H "Content-Type: application/json" -d '{"image_url":"https://example.com/mixed_sample.jpg"}'
curl.exe -X POST http://localhost:8000/classify -H "Content-Type: application/json" -d '{"image_url":"https://example.com/unknown.jpg"}'
```

The first four return the documented sample classes. The last returns `Mixed Scrap / Unknown` with a confidence of `0.0` and manual verification required.

## Provider behavior

Set `OPENAI_API_KEY` and optionally `OPENAI_MODEL` to enable vision classification. Provider calls time out after `CLASSIFICATION_TIMEOUT` milliseconds (default 5000). Every provider response is constrained and revalidated against the seven allowed materials, the grade reference, numeric bounds, and the confidence/manual-review threshold before it is returned.

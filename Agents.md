# ScrapValue Recovery — Project Instructions

## Product
AI-assisted factory scrap classification, valuation, and buyer routing.

## Core Flow
Scrap Intake → AI Classification → Valuation → Buyer Match → Lot Summary → Analytics

## Core Automation
Image + batch details
→ AI estimates material/grade/contamination
→ deterministic pricing engine calculates value
→ rules recommend buyer category.

## Critical Architecture Rule
AI DOES NOT determine final price.
AI only classifies:
- material
- grade
- confidence
- contamination %
- reasoning

Pricing is deterministic/config-driven.

## Supported Materials
Steel, Stainless Steel, Aluminium, Copper, Brass, Plastic, Mixed Scrap.

## Pricing
Gross Value = Weight × Base Rate × Grade Factor
Net Value = Gross Value × (1 - contamination/100) - Logistics Cost

All rates are DEMO assumptions, not live market prices.

## AI Safety
Never claim chemical/material certainty from an image.
Low confidence → manual verification.
Always show valuation disclaimer.

## Product UI
Dashboard
AI Scan
Buyer Network
Analytics
Settings

## Hackathon Priority
The complete core workflow must work end-to-end.
Do not build fake/static screens where the underlying flow can be functional.

## Development Rules
- React + Vite
- Keep AI, pricing, and buyer recommendation logic separated.
- Use reusable components.
- Keep configuration separate from business logic.
- Never hardcode API keys.
- Preserve existing UI when modifying functionality.
PRD

1\. Product summary

Factory scrap is often sold as one mixed lot at a low common rate, even when parts of that lot contain higher-value metals or cleaner grades. This causes manufacturers to lose recoverable value and makes pricing discussions with buyers opaque.



ScrapValue Recovery is a lightweight web application that helps a factory operator:



Upload or select a scrap image.



Enter the scrap batch’s estimated weight.



Receive an AI-assisted material and grade estimate.



Calculate an explainable estimated value.



Compare the value of mixed-rate sale versus grade-based sale.



Generate a structured scrap-lot summary for a relevant buyer category.



The MVP is designed to demonstrate one automation clearly: first-pass scrap classification and valuation.



2\. Problem statement

Factories commonly accumulate scrap such as steel offcuts, aluminium pieces, copper wire, plastic packaging, and mixed reject material. When these materials are combined and sold as a single lot:



Buyers apply a lower “mixed scrap” rate.



Higher-quality materials are undervalued.



Factory staff rely on manual visual inspection and informal rate estimates.



There is limited traceability of what was sold, at what grade, and why it received a given price.



Buyers and sellers may dispute the grade, contamination level, weight, or rate.



The product must demonstrate how a structured intake process, AI-assisted first-pass grading, and transparent valuation can improve the seller’s decision-making.



3\. Goals

Primary goal

Demonstrate that an operator can turn a scrap image and basic batch information into a clear, explainable estimated scrap valuation in less than two minutes.



Secondary goals

Show the economic difference between selling scrap as mixed material and selling it by estimated grade.



Make the pricing methodology understandable to a non-technical factory operator.



Generate a simple traceable lot record.



Recommend an appropriate buyer category for the identified material.



Build a stable demo that still works if an external AI API is unavailable.



Success criteria

The hackathon MVP is successful if it can reliably demonstrate this flow:



text

Image + weight + location

&#x20;         ↓

AI-assisted material/grade estimate

&#x20;         ↓

Rule-based valuation

&#x20;         ↓

Mixed-rate comparison

&#x20;         ↓

Buyer-ready lot summary

Non-goals

The MVP will not attempt to provide:



A real-time commodity-price marketplace.



Binding purchase offers.



Payments or invoicing.



Live logistics booking.



Full buyer and seller onboarding.



Weighbridge or IoT-scale integration.



Chemical or laboratory-grade material verification.



Government recycling certification.



Enterprise ERP integration.



A custom-trained computer-vision model.



A complete multi-user marketplace.



4\. Target users

Primary persona: Factory scrap manager

Role: Supervises scrap collection, segregation, temporary storage, and sale.



Pain points:



Does not know whether the offered scrap rate is fair.



Cannot quickly distinguish high-value and low-value material in mixed lots.



Lacks a consistent record of scrap quality and valuation.



Needs a quick decision tool rather than a complex enterprise system.



Needs:



Easy image upload.



Simple weight entry.



Plain-language material and grade estimate.



Transparent price breakdown.



Exportable or shareable lot summary.



Explicit warning that the final price requires physical inspection.



Secondary persona: Recycler / scrap buyer

Role: Buys sorted industrial scrap from factories.



Needs:



Standardized batch details.



Clear material classification.



Estimated contamination.



Weight and location.



Lot ID for traceability.



A basis for faster quote review.



5\. User stories

Must-have user stories

As a factory operator, I want to upload a photo of a scrap batch so that the system can estimate the material and grade.



As a factory operator, I want to enter the estimated batch weight so that the system can calculate an estimated total value.



As a factory operator, I want to see the material type, estimated grade, confidence level, and contamination note so that I can decide whether the batch needs manual review.



As a factory operator, I want to see how the valuation was calculated so that I can understand and trust the result.



As a factory operator, I want to compare mixed-scrap value with sorted-grade value so that I can see the potential value recovery.



As a factory operator, I want to generate a lot summary so that I can share standardized details with a buyer.



As a demo presenter, I want preloaded sample data so that the application works even if the internet or AI API fails.



Nice-to-have user stories

As a factory operator, I want to manually correct the detected material or grade so that I can account for local knowledge or physical inspection.



As a factory operator, I want to download a PDF or CSV summary so that I can preserve a record.



As a buyer, I want a QR code tied to a batch ID so that I can retrieve batch details easily.



As a factory manager, I want to view prior analysed lots so that I can track estimated recovered value over time.



6\. Core workflow

Happy path

User opens ScrapValue Recovery.



User uploads a photo or selects a sample scrap image.



User enters:



Material category, if known.



Estimated weight in kilograms.



Factory/location.



Optional notes.



User clicks Analyze scrap.



The application:



Identifies an estimated material category.



Identifies an estimated material grade.



Estimates contamination or visible mixed content.



Provides a confidence score.



Assigns a buyer category.



The application calculates:



Mixed-lot value.



Grade-based estimated value.



Potential value recovery.



User reviews the result.



User optionally corrects material or grade.



User clicks Generate lot summary.



Application creates a lot ID and displays a buyer-ready summary.



Example workflow

text

Input:

Image: aluminium extrusion scraps

Weight: 250 kg

Location: Chandigarh

Visible contamination: low



AI estimate:

Material: Aluminium

Grade: Clean extrusion

Confidence: 86%

Contamination estimate: 5%



Result:

Mixed-lot estimate: ₹30,000

Grade-based estimate: ₹38,231

Potential recovery: ₹8,231

Buyer type: Aluminium recycler

Lot ID: SVR-20260919-001

All values must be marked as illustrative estimates for the prototype.



7\. Functional requirements

FR-1: Scrap image intake

The system must allow the user to:



Upload JPG, JPEG, PNG, or WEBP image files.



View a preview of the uploaded image.



Select from at least three sample images.



Receive a clear error if the uploaded image is invalid.



Continue using a sample classification if AI analysis is unavailable.



Acceptance criteria



Valid image uploads show a preview.



Invalid file uploads show an actionable error.



Sample images can complete the entire user journey.



Image upload is not required when a sample is selected.



FR-2: Batch details form

The system must collect:



Weight in kilograms — required.



Location — optional or preset.



Notes — optional.



Material hint/category — optional.



Input source — uploaded image or sample data.



Validation rules



Weight must be greater than zero.



Weight must be numeric.



Weight must have a reasonable maximum limit for demo purposes.



Empty material hint is permitted because AI may classify it.



Location may default to “Not specified.”



FR-3: AI-assisted classification

The system must produce the following structured output:



Material category.



Grade.



Confidence score.



Estimated contamination percentage or contamination descriptor.



Brief reason for the classification.



Recommendation for manual verification where confidence is low.



Supported demo material categories:



Ferrous steel.



Stainless steel.



Aluminium.



Copper.



Brass.



Plastic.



Mixed scrap.



Acceptance criteria



Output uses one of the supported material categories.



Confidence is shown as a percentage.



Low-confidence outputs show a warning.



User can manually override material and grade.



If the AI call fails, a mock or rules-based fallback response is returned.



FR-4: Pricing engine

The application must calculate estimated scrap value using configured demo rates.



Suggested formula:



Gross Value

=

Weight

×

Base Rate

×

Grade Factor

Gross Value=Weight×Base Rate×Grade Factor

Net Estimated Value

=

Gross Value

×

(

1

−

Contamination %

100

)

−

Logistics Cost

Net Estimated Value=Gross Value×(1−

100

Contamination %

​

&#x20;)−Logistics Cost

The system must display:



Base rate per kg.



Grade factor.



Contamination deduction.



Logistics deduction.



Final estimated value.



Mixed-scrap baseline value.



Potential estimated value recovery.



Acceptance criteria



The final number changes when weight changes.



The final number changes when grade changes.



The calculation breakdown is visible.



The application never displays a negative final value.



The result is clearly labelled as an estimate.



Demo rates are labelled as non-live and configurable.



FR-5: Value comparison

The system must visually compare:



Current state: Mixed scrap sold at a low blended/common rate.



Improved state: Grade-based estimated valuation.



Recovered value: Difference between the two amounts.



Acceptance criteria



Comparison is visible on the results screen.



Recovered value is shown in currency and percentage terms.



The display never implies that recovery is guaranteed.



The user can understand the comparison without reading technical documentation.



FR-6: Buyer recommendation

The system must recommend a buyer category based on detected material:



Detected material	Recommended buyer category

Ferrous steel	Steel recycler / foundry

Stainless steel	Stainless scrap processor

Aluminium	Aluminium recycler

Copper	Copper recycler / cable processor

Brass	Non-ferrous metal buyer

Plastic	Plastic reprocessor

Mixed scrap	Sorting partner / mixed-scrap recycler

Acceptance criteria



Every supported material category maps to a buyer category.



Mixed scrap produces a recommendation to sort or conduct manual review.



Buyer recommendations are generic and do not claim verified buyer availability.



FR-7: Lot summary

The system must generate a structured lot summary containing:



Lot ID.



Creation timestamp.



Uploaded image or sample reference.



Material.



Grade.



Confidence.



Weight.



Estimated contamination.



Rate assumptions.



Estimated value.



Comparison with mixed rate.



Buyer category.



Disclaimer.



Acceptance criteria



Lot IDs are unique for the demo session.



A user can copy or download the summary.



Lot summaries contain the required disclaimers.



The generated summary does not contain secrets or API keys.



8\. Non-functional requirements

Usability

Complete the main flow in fewer than two minutes.



Use plain language instead of scrap-industry jargon wherever possible.



Use large, visible primary actions.



Make the value result prominent.



Include contextual explanations for confidence, grade factor, and contamination.



Performance

Render the application interface within a few seconds.



Return a fallback result if AI analysis takes too long.



Avoid blocking the user indefinitely during image processing.



Cache sample-image results.



Reliability

The demo must work offline or without AI access using predefined sample results.



Do not make a working presentation dependent on a live external API.



Preserve entered fields if analysis fails.



Accessibility

Use readable font sizes.



Use sufficient contrast.



Avoid using color alone to communicate errors or confidence.



Support keyboard navigation for core form controls.



Give images alt-style labels or descriptive text where applicable.



Maintainability

Keep rates and grade factors in a configuration file.



Keep AI prompt logic separate from UI code.



Keep valuation logic in a dedicated function or module.



Use descriptive variable names and lightweight documentation.



9\. Data requirements

Core data entities

Entity	Purpose	Required fields

Scrap lot	Represents one batch of scrap	Lot ID, material, grade, weight, value, timestamp

Material catalog	Holds supported materials and rates	Material, base rate, buyer category

Grade catalog	Holds grade-specific adjustments	Material, grade, grade factor

Analysis result	Holds AI or mock classification output	Material, grade, confidence, contamination, explanation

Pricing result	Holds calculations	Gross value, deductions, net value, recovery value

Suggested material configuration

python

MATERIAL\_CONFIG = {

&#x20;   "Aluminium": {

&#x20;       "base\_rate\_per\_kg": 185,

&#x20;       "mixed\_rate\_per\_kg": 120,

&#x20;       "buyer\_category": "Aluminium recycler",

&#x20;       "grades": {

&#x20;           "Clean extrusion": 1.00,

&#x20;           "Mixed aluminium": 0.72

&#x20;       }

&#x20;   },

&#x20;   "Copper": {

&#x20;       "base\_rate\_per\_kg": 650,

&#x20;       "mixed\_rate\_per\_kg": 390,

&#x20;       "buyer\_category": "Copper recycler / cable processor",

&#x20;       "grades": {

&#x20;           "Clean copper": 1.00,

&#x20;           "Insulated or mixed copper": 0.60

&#x20;       }

&#x20;   },

&#x20;   "Steel": {

&#x20;       "base\_rate\_per\_kg": 45,

&#x20;       "mixed\_rate\_per\_kg": 32,

&#x20;       "buyer\_category": "Steel recycler / foundry",

&#x20;       "grades": {

&#x20;           "HMS 1": 1.00,

&#x20;           "Light or mixed steel": 0.72

&#x20;       }

&#x20;   }

}

Rates should be described as demo assumptions rather than market prices.



10\. UX requirements

Screen 1: Landing and intake

Components:



Product title.



One-line explanation.



Upload zone.



Sample-image selector.



Weight field.



Location field.



Notes field.



Material hint selector.



Analyze button.



Primary CTA:



text

Analyze Scrap Lot

Screen 2: Analysis and valuation

Components:



Image preview.



Material and grade card.



Confidence indicator.



Contamination note.



Buyer recommendation.



Price estimate card.



Formula breakdown.



Mixed-versus-sorted comparison.



Manual override controls.



Generate summary button.



Primary CTA:



text

Generate Lot Summary

Screen 3: Lot summary

Components:



Lot ID.



Complete batch details.



Valuation result.



Buyer category.



Key disclaimer.



Copy/download button.



New analysis button.



Primary CTA:



text

Analyze Another Lot

Required empty and error states

No image selected.



Invalid image upload.



Missing weight.



Negative weight.



AI unavailable.



Low confidence.



Unsupported material.



No configured rate available.



11\. Technology requirements

Recommended MVP stack

Layer	Technology	Reason

Application	Python + Streamlit	Fastest path to a working web demo

UI state	Streamlit session state	Minimal setup

Data storage	In-memory data or SQLite	Low overhead

Data handling	Pandas	Simple tables and exports

Image preview	Pillow	Standard Python image support

Visuals	Plotly or Streamlit charts	Simple comparison chart

AI integration	Vision-capable LLM API	Fast prototype classification

Environment secrets	.env + environment variables	Prevents hardcoded keys

Deployment	Streamlit Cloud / local host	Fast deployment or reliable fallback

Required packages

text

streamlit

pandas

Pillow

plotly

python-dotenv

qrcode

Optional packages:



text

openai

reportlab

Recommended architecture

text

Streamlit UI

&#x20;  ↓

Input validation

&#x20;  ↓

AI classifier or demo fallback

&#x20;  ↓

Material/grade output

&#x20;  ↓

Pricing engine

&#x20;  ↓

Value comparison

&#x20;  ↓

Lot summary generator

12\. AI requirements

Purpose

The AI is not the final authority on material composition. It automates a first-pass visual classification so that the operator can receive a faster initial estimate and know when manual inspection is required.



Required AI output format

json

{

&#x20; "material": "Aluminium",

&#x20; "grade": "Clean extrusion",

&#x20; "confidence": 0.86,

&#x20; "contamination\_percent": 5,

&#x20; "reason": "The image appears to contain clean, light-coloured aluminium profiles with limited visible mixed material.",

&#x20; "manual\_verification\_required": false

}

AI guardrails

Never claim chemical-grade certainty from an image.



Never claim live market pricing.



Always state that final pricing requires physical inspection.



Return only supported material categories.



Require manual review for low-confidence results.



Provide a deterministic fallback classification for sample images.



Let the user override the result.



Suggested confidence rules

Confidence level	Application behavior

80–100%	Show estimate and standard verification note

60–79%	Show “review recommended” warning

Below 60%	Ask for clearer image or manual material selection

AI error	Use fallback mode and state that classification is demo-based

13\. Security and privacy requirements

MVP requirements

Keep API keys in environment variables.



Do not commit API keys to GitHub.



Do not store image uploads permanently unless needed.



Limit accepted upload formats.



Set a reasonable image-size limit.



Do not collect bank, payment, Aadhaar, PAN, or sensitive employee data.



Avoid real customer, factory, and buyer data in the demo.



Provide a clear reset button that clears the active session.



Do not log raw images or private notes in public error messages.



Use sample data for the final presentation where possible.



Required disclaimer

text

This valuation is an indicative estimate based on image analysis and configured demo pricing assumptions. Final material grade, weight, contamination, and sale price require physical inspection and agreement with the buyer.

Future production requirements

Authentication and authorization.



Role-based access control.



Encryption in transit and at rest.



Audit trails.



Secure cloud file storage.



Data-retention policy.



Consent and privacy notices.



Vendor due diligence for AI providers.



Backup and disaster recovery.



Malware scanning for uploads.



Rate limiting and monitoring.



Compliance review under applicable data-protection and waste-management laws.



14\. Testing and QA requirements

Functional testing

Test area	Test

Upload	Upload JPG, PNG, invalid file, oversized file

Form validation	Empty weight, zero weight, negative weight, text weight

AI output	High confidence, low confidence, unsupported output, timeout

Fallback	Run without API key or internet

Pricing	Verify calculations for at least three known examples

Manual override	Change material and grade and verify price changes

Lot generation	Confirm lot ID generation and content completeness

Export	Verify copied/downloaded summary includes required fields

Reset	Confirm form and session data clear correctly

Calculation test cases

Case	Input	Expected behavior

Clean aluminium	250 kg, 5% contamination	High-value aluminium estimate

Mixed steel	500 kg, 20% contamination	Lower grade and lower valuation

Negative weight	-100 kg	Validation error; no calculation

Unknown material	Image unclear	Manual selection required

AI outage	API unavailable	Demo fallback result displays

High logistics cost	Low-value lot	Final value cannot fall below zero

Demo QA checklist

Test the exact sample images you will present.



Test the app without internet.



Test the app without AI credentials.



Test with browser zoom at 100%.



Test the full demo from a fresh browser tab.



Keep screenshots or a screen recording as backup.



Verify slide values match the application values.



Ensure all demo rates are labelled as illustrative.



15\. Documentation requirements

README

The project repository must include:



Product overview.



Problem statement.



Feature list.



Architecture overview.



Installation steps.



Environment-variable setup.



Local run command.



Deployment steps.



Sample data instructions.



Rate configuration instructions.



Known limitations.



Security notes.



Demo script.



In-app onboarding

Include a short three-step guide:



Upload a clear photo or choose a sample scrap lot.



Enter the approximate lot weight.



Review the estimated grade, valuation, and recommended buyer category.



Support/FAQ content

Is this the final sale price?



Can an image determine exact metal composition?



What should I do if confidence is low?



Can I correct the detected material?



How are prices calculated?



How can rates be updated?



What data is stored?



16\. Deliverables

Required deliverables

Working web prototype.



Source code repository.



README.



requirements.txt.



.env.example.



Sample images or demo records.



Configurable demo pricing table.



Five-slide presentation.



One-page problem/business summary.



Test checklist.



Two-minute pitch script.



Backup screenshots or screen recording.



Optional deliverables

QR code for each lot.



PDF lot summary.



CSV export.



Basic lot history.



Comparison chart.



Deployed public demo link.



17\. Four-hour delivery plan

Time	Activity	Output

0:00–0:20	Finalize scope, rate assumptions, sample materials	Product brief and sample scenarios

0:20–0:45	Set up codebase, UI shell, sample assets	Running empty application

0:45–1:45	Build intake, classification fallback, pricing logic	End-to-end core workflow

1:45–2:15	Add comparison, buyer suggestion, summary generation	Demo-ready business value story

2:15–2:45	Improve UI, validation, disclaimers, error states	Presentable product

2:45–3:15	Test, fix, verify offline fallback	Stable demo

3:15–3:40	Build five-slide deck and pitch	Presentation assets

3:40–4:00	Rehearse and prepare backup	Final submission package

18\. MVP acceptance checklist

The project is ready to present only when all of the following are true:



A user can upload an image or select a sample.



A user can enter a valid scrap weight.



The application produces material and grade output.



The application displays a confidence level.



The application can work without live AI access.



The application calculates a transparent estimated value.



The user can see mixed-rate versus grade-based value.



The application recommends a buyer category.



The user can generate a lot ID and summary.



The interface contains a physical-verification disclaimer.



API keys are not hardcoded or displayed.



The presentation includes a live or recorded demo.



The team can explain the pricing formula and the AI limitation.



Questions for you

Please answer these so I can tailor the next version of the PRD, the wireframe, the data model, and the exact build plan.



Scope and users

Is this strictly a hackathon demo, or do you want it designed as the first version of a real startup product?



Who is your main target user?



Factory owner



Scrap-yard operator



Factory floor supervisor



Recycler/buyer



Procurement team



Another user



Are you targeting a specific industry?



Automotive



Manufacturing/fabrication



Construction



Electronics



Textile



General industrial scrap



Which materials should your demo support first?



Steel



Aluminium



Copper



Brass



Plastic



E-waste



Mixed scrap


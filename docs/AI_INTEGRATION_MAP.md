# AI Integration Map

AI should help the customer and dispatcher move faster. It should not replace dispatch control at first.

## Best Places To Implant AI

### 1. Customer Intake Classifier

When a customer does not pick a trade, AI can classify the request from their description and photos.

Inputs:
- Customer description
- Selected service, if any
- Uploaded photos
- Company service catalog

Outputs:
- Suggested trade
- Suggested service
- Urgency level
- Dispatcher notes
- Follow-up questions

Why this is first:
- It improves the no-trade booking flow immediately.
- It saves office staff time.
- It can run in demo mode before live sending.

### 2. Smart Pricing Assistant

AI can explain price ranges and recommend whether the job should be a fixed-price visit, free quote, deposit, or manual review.

Inputs:
- Service catalog
- Customer description
- ZIP/service area
- Add-ons

Outputs:
- Estimated range
- Confidence level
- Reason the job needs review

Guardrail:
- AI should suggest, not finalize, pricing unless the company explicitly enables automatic pricing.

### 3. Dispatch Recommendation

AI can recommend the best crew based on trade, distance, availability, urgency, and skill fit.

Inputs:
- Booking details
- Crew roster
- Crew trade
- Open windows
- Distance

Outputs:
- Recommended crew
- Reasoning summary
- Suggested arrival window

### 4. Confirmation Message Writer

AI can generate plain-language SMS and email confirmations using company tone.

Inputs:
- Booking
- Company profile
- Arrival window
- Payment status

Outputs:
- SMS text
- Email subject
- Email body

Guardrail:
- Dispatcher can preview before sending.

### 5. Photo Triage

For roofing, HVAC, and electrical, AI vision can summarize visible issues from customer-uploaded images.

Inputs:
- Uploaded photos
- Customer description

Outputs:
- Photo summary
- Safety warning if needed
- Parts or equipment hints
- Whether more photos are needed

Guardrail:
- Never present AI photo analysis as a formal diagnosis.

### 6. Dispatcher Copilot

Inside the company dashboard, AI can answer operational questions.

Examples:
- "Which jobs still need confirmation?"
- "Show urgent jobs with no crew assigned."
- "Draft a reschedule message for Maya."
- "Summarize today's revenue and open jobs."

## Implemented First AI Feature

The first AI feature is **Customer Intake Classifier**.

It fits the current product best because the app already supports:
- No required trade selection
- Customer description
- Photo input
- Dispatcher review
- Service catalog
- Work order notes

## Implementation Shape

Backend endpoint:

```txt
POST /api/ai/classify-request
```

Current behavior:

- Uses demo rules when `OPENAI_API_KEY` is not set.
- Uses the OpenAI Responses API with Structured Outputs when `OPENAI_API_KEY` is set.
- Returns suggested trade, service, urgency, confidence, dispatcher notes, and follow-up questions.
- Lets the customer apply the suggestion before scheduling.
- Saves the AI suggestion into the work order for dispatcher review.

Request:

```json
{
  "companySlug": "bright-home-services",
  "description": "Water is coming through the ceiling near the hallway light.",
  "selectedTrade": "",
  "selectedService": "",
  "photos": []
}
```

Response:

```json
{
  "suggestedTrade": "Roofing",
  "suggestedService": "Leak inspection",
  "urgency": "High",
  "confidence": 0.82,
  "dispatcherNotes": "Possible roof leak near electrical fixture. Recommend roof inspection and safety caution.",
  "followUpQuestions": [
    "Is water actively dripping right now?",
    "Can you upload a photo of the ceiling stain?"
  ]
}
```

## AI Safety Rules

- Always label AI output as suggested.
- Let the dispatcher override every AI recommendation.
- Do not claim a diagnosis from photos.
- Do not auto-send messages in live mode until the company enables it.
- Log AI decisions for review.
- Avoid sending sensitive customer data to AI unless the privacy policy covers it.

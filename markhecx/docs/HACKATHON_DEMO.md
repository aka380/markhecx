# MarkHECX: AI creator marketplace

## Three-minute demo

1. Open `/studio` from the homepage's **Find my AI creator** action. No sign-in is needed. Explain that the seven creators and media are illustrative demo records.
2. Load **Cinematic product launch**. Point out the editable content type, tools, skills, format, aspect ratio, commercial rights, budget and deadline.
3. Shortlist Zoya and Arjun. Click **Compare 2/4**. Inspect required skills, tool fit, format and aspect-ratio evidence. The recommendation is computed, not a hard-coded 95% badge.
4. Change the aspect ratio from 16:9 to 9:16. Show the score responding. Change required tools to an unavailable tool to demonstrate a mismatch. Clear the brief to show that no evidence yields no invented score.
5. Open **Workflow & rights**, then **View portfolio**. Show tools/models, human contribution, source assets, project media and the self-declared evidence labels.
6. Export the decision brief as JSON. It includes the exact requirements, selected creator metadata, scores, factor weights and questions to ask before hiring.
7. Open the campaign builder. In browser demo mode choose Brand / Agency or Client / Individual, complete a brand profile, save a campaign, and inspect matching. Local brief extraction and suggestions work without an external provider; live AI requires the server configuration.

## Data model

`Creator` includes identity, skills, categories, projects and optional `CreativeCapabilities`. Capabilities record tools, models, specialization, content types, formats, aspect ratio, platforms, workflow steps, human contribution, source assets, evidence references, commercial-use status and a self-declared minimum budget/currency. Published projects may contribute capabilities. Evidence references and sample badges are not third-party verification.

`Campaign` includes title, brief, objective, creative direction, skill/identity/category requirements, tools, content type, format, aspect ratio, platforms, commercial use, budget/currency, dates and deliverables. Drafts remain editable; the studio itself does not publish or contact anybody.

`CreatorMatch` includes score, coverage and factor records (`key`, `label`, `weight`, `value`, `evidence`, `blocking`). Unknown evidence uses `null`. Score = weighted alignment / known weights. Coverage = known weights / all requested weights. A high score with low coverage is not a strong recommendation. Scores are not probabilities of success. Style, deadlines and actual quality require human review.

`CreatorComparison` includes ordered candidate IDs, factor references, concerns, questions, provider label and an optional recommendation. Weak matches, ties and failing blocking factors do not produce a winner. The public studio uses the same deterministic engine as campaigns. No model training, external research or live Gemini generation is claimed for this path.

## Deployment and limits

Vercel runs Next.js. The existing Express/MongoDB backend is selected with `MARKHECX_API_URL`. Browser demo storage is device-local, not secure multi-user account storage or cross-device sync. Google OAuth still requires authorized origins and server verification for real account access. Email, live Gemini, multi-user messages and persistent shared records require a reachable configured backend. The studio works independently of those services.

## Validation

Production build and regression suite cover the app. New regression checks distinguish an unknown aspect ratio from a mismatch and reject comparison recommendations for empty evidence, duplicate candidates, ties and blocked requirements. Browser checks cover sample loading, factor tables and mobile overflow. Run `npm run test:regression` and `npm run test:matching` before presenting.

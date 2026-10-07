# MarkHECX: AI creator marketplace

## Three-minute demo

1. Open `/studio` from the homepage's **Find my AI creator** action. No sign-in is needed. Explain that the seven creators and media are illustrative demo records.
2. Load **Cinematic product launch**. Point out the editable content type, tools, skills, format, aspect ratio, commercial rights, budget and deadline.
3. Shortlist Zoya and Arjun. Click **Compare 2/4**. Inspect required skills, tool fit, format and aspect-ratio evidence. The recommendation is computed, not a hard-coded 95% badge.
4. Change the aspect ratio from 16:9 to 9:16. Show the score responding. Change required tools to an unavailable tool to demonstrate a mismatch. Clear the brief to show that no evidence yields no invented score.
5. Open **Workflow & rights**, then **View portfolio**. Show tools/models, human contribution, source assets, project media and the self-declared evidence labels.
6. Export the decision brief as JSON. It includes the exact requirements, selected creator metadata, scores, factor weights and questions to ask before hiring.
7. Open the campaign builder. With production account services configured, choose Brand / Agency or Client / Individual, complete a brand profile, save a campaign, and inspect matching. For live brief generation, configure Gemini on the server. Local brief extraction is only available in explicitly enabled development demo mode.

## Data model

`Creator` includes identity, skills, categories, projects and optional `CreativeCapabilities`. Capabilities record tools, models, specialization, content types, formats, aspect ratio, platforms, workflow steps, human contribution, source assets, evidence references, commercial-use status and a self-declared minimum budget/currency. Published projects contribute searchable tools, models, content types and formats. Project-specific commercial-use claims never automatically grant rights for a new engagement; matching uses the creator’s explicit profile-level declaration. Evidence references and sample badges are not third-party verification.

`Campaign` includes title, brief, objective, creative direction, skill/identity/category requirements, tools, content type, format, aspect ratio, platforms, commercial use, budget/currency, dates and deliverables. Drafts remain editable; the studio itself does not publish or contact anybody.

`CreatorMatch` includes score, coverage and factor records (`key`, `label`, `weight`, `value`, `evidence`, `blocking`). Unknown evidence uses `null`. Score = weighted alignment / known weights. Coverage = known weights / all requested weights. A high score with low coverage is not a strong recommendation. Scores are not probabilities of success. Style, deadlines and actual quality require human review.

`CreatorComparison` includes ordered candidate IDs, factor references, concerns, questions, provider label and an optional recommendation. Weak matches, ties and failing blocking factors do not produce a winner. The public studio uses the same deterministic engine as campaigns. No model training, external research or live Gemini generation is claimed for this path.

## Deployment and limits

Vercel runs Next.js and the existing Express API together at `/api/v1`. Production uses MongoDB-backed accounts and server-verified Google identities. Configure the variables in [PRODUCTION_SETUP.md](./PRODUCTION_SETUP.md), including a reachable Atlas database, Google OAuth origins, Gemini and verified email sending. The studio works independently of those services. Browser demo storage is only available in explicitly enabled development mode; production outages never create local accounts.

## Validation

Production build and regression suite cover the app. New regression checks distinguish an unknown aspect ratio from a mismatch and reject comparison recommendations for empty evidence, duplicate candidates, ties and blocked requirements. Browser checks cover sample loading, factor tables and mobile overflow. Run `npm run test:regression` and `npm run test:matching` before presenting.


## Rubric audit — 7 October 2026

| Criterion | Demonstration | Boundary to explain |
| --- | --- | --- |
| AI portfolios | Open a creator’s portfolio → View Project for tools/models, workflow, human contribution, assets and inline video. | Sample artwork/video is illustrative; evidence references remain self-declared. |
| Brief definition | Campaign editor and HECX brief assistant support requirements, content, style, format, aspect ratio and rights. AI proposals must be reviewed before saving. | Generation is not publication or a licensing decision. |
| Discovery | Combine tools/content/format/platform filters, then try an unavailable tool and remove its filter. Server search includes published project evidence. | Sample profiles appear only on the first page; live profiles are paginated. |
| UX | Compare 2–4 creators in the studio; inspect percentage factors and missing evidence. Check on a phone-size viewport. | A match percentage is evidence alignment, not a probability of success. |
| Presentation | Follow the three-minute script above and export the decision brief. | State the production limits below rather than claiming independent verification. |

Search filters now apply to sample and live results, active AI filters are removable, public filter choices remain available after narrowing results, and backend failures surface a retry action. Name relevance and published-project count are ordered before server pagination.

Production email still needs a verified sending domain to reach arbitrary recipients. Delivery/revision coordination currently uses engagement conversations and campaign status; there is no escrow/payment system or independent tool/license certification.

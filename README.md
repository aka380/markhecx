# MarkHECX — AI Content Creator Marketplace

**Find the right AI creator. Understand the match. Turn a creative brief into collaboration.**

MarkHECX connects brands, agencies, and individual clients with AI filmmakers, animators, designers, and generative content creators.

The platform brings creator discovery, AI-specific portfolios, structured campaign briefs, explainable matching, and collaboration into one workspace.

## Live Links

- **Website:** https://markhecx.vercel.app
- **Interactive Demo:** https://markhecx.vercel.app/studio
- **Creator Discovery:** https://markhecx.vercel.app/creators
- **Campaigns:** https://markhecx.vercel.app/campaigns

> For the quickest demonstration, open Match Studio. No account is required.

## The Problem

Traditional freelance platforms rarely explain how AI-generated work was produced. Brands need more than a portfolio thumbnail: they need to understand the creator’s tools, skills, workflow, human contribution, and commercial-use conditions.

MarkHECX makes that information part of discovery and evaluation.

## Features

### Creator Profiles and AI Portfolios

Creators can build profiles and publish projects containing:

- Skills and specialization
- Tools and models used
- Images and videos
- Workflow steps and human contribution
- Source-asset information
- Formats, aspect ratios, and commercial-use declarations

Published project capabilities contribute to search. Private drafts remain excluded.

### Creator Discovery

Search and filter creators using:

- Skills and creator identity
- Tools and specialization
- Content type, platform, and format
- Categories and portfolio availability

Discovery supports sorting, pagination, removable filters, and clear empty-result states.

### Creative Briefs and Campaigns

Brands and clients can define:

- Campaign goals and creative direction
- Required skills and tools
- Content type, format, and aspect ratio
- Platforms and deliverables
- Budget, deadlines, and commercial-use requirements

Campaign workflows connect applications, invitations, saved creators, conversations, and campaign status.

### HECX Intelligence

HECX integrates Google Gemini through the server for AI assistance, including structured brief proposals.

AI-generated proposals are reviewed and edited before being applied. API keys remain server-side.

### Explainable Creator Matching

Matching evaluates recorded requirements against available creator evidence.

Each assessment exposes:

- Requirement-match percentage
- Evidence coverage
- Individual factors and weights
- Supported strengths
- Missing evidence and mismatches
- Questions to resolve before choosing a creator

Match Studio supports comparing two to four sample creators and exporting a decision brief as JSON.

### Accounts and Collaboration

- Email/password authentication
- Server-verified Google sign-in
- Creator, Brand/Agency, and Individual Client experiences
- Persistent MongoDB-backed workspaces
- Role-based access, session protection, and CSRF checks
- Campaign applications, invitations, and participant conversations

## How Matching Works

The core score is deterministic and explainable:

```text
Match score =
  Σ(factor weight × known factor alignment)
  ÷ Σ(known factor weights)
  × 100

Evidence coverage =
  Σ(known factor weights)
  ÷ Σ(all requested factor weights)
  × 100
```

Missing information is treated as unknown.

A 95% match describes alignment with recorded requirements. It is not a 95% probability of success or a guarantee of quality.

Recommendations also consider evidence coverage and blocking requirements. Past-project licensing claims do not automatically establish permission for a new campaign.

## Three-Minute Demo

1. Open [Match Studio](https://markhecx.vercel.app/studio).
2. Load **Cinematic product launch**.
3. Shortlist Zoya Rao and Arjun Kale.
4. Select **Compare 2/4**.
5. Inspect the factor table and missing evidence.
6. Change the aspect ratio or required tools and observe the scores.
7. Open a portfolio to inspect project media and workflow details.
8. Export the shortlist and its supporting evidence.

The studio contains seven fictional sample profiles with illustrative media. They demonstrate the evaluation flow and are not real creators available for hire.

## Technology Stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js, React, TypeScript |
| Interface | Tailwind CSS, CSS Modules, reusable UI components |
| Backend | Express integrated through Next.js API routes |
| Database | MongoDB |
| AI assistance | Google Gemini |
| Authentication | Google Identity Services and server-managed sessions |
| Email integration | Resend |
| Deployment | Vercel |
| Verification | GitHub Actions and automated regression tests |

The frontend and API deploy together. API requests use `/api/v1`.

## Data Model

### Creator and Portfolio

Stores identity, skills, published projects, and creative capabilities such as tools, models, formats, workflows, evidence references, and commercial-use declarations.

### Campaign

Stores the brief, objectives, requirements, creative direction, deliverables, budget, dates, formats, platforms, and rights requirements.

### Match Assessment

Stores the calculated score, evidence coverage, factor weights, explanations, gaps, and blocking conditions.

### Collaboration

Applications, invitations, saved records, and conversations connect creators with campaigns while enforcing ownership and participant access.

## Local Setup

### Requirements

- Node.js 22.13 or later
- npm
- A MongoDB replica set, such as MongoDB Atlas
- Provider credentials for the integrations you want to use

```bash
git clone https://github.com/aka380/markhecx.git
cd markhecx/markhecx

npm ci
cp server/.env.example server/.env
```

Configure `server/.env` using the supplied example.

Important settings include:

```dotenv
MONGODB_URI=your_mongodb_connection_string
MONGODB_DATABASE=markhecx
WEB_ORIGINS=http://127.0.0.1:3001

GOOGLE_CLIENT_ID=your_google_web_client_id

HECX_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=your_available_gemini_model

EMAIL_PROVIDER=resend
RESEND_API_KEY=your_resend_api_key
EMAIL_FROM=your_verified_sender
```

Never commit populated environment files or expose secret keys through `NEXT_PUBLIC_` variables.

Start the application:

```bash
npm run dev
```

Open **http://127.0.0.1:3001**.

## Build and Verification

```bash
npm run lint
npm run test:regression
npm run test:matching
npm run backend:build
npm run build
```

Backend integration tests require the isolated local test database:

```bash
npm run test:backend
```

GitHub Actions checks lint, frontend regressions, matching scenarios, API compilation, and the production build. The connected Vercel Git integration deploys the `main` branch.

## Deployment

Production configuration belongs in Vercel’s environment settings.

Verify database connectivity at:

```text
https://markhecx.vercel.app/api/v1/health
```

Expected healthy response:

```json
{
  "status": "ok",
  "database": "connected",
  "apiVersion": "v1"
}
```

See [Production Setup](docs/PRODUCTION_SETUP.md) for environment variables, Google OAuth origins, and launch checks.

## Current Prototype Limits

- Sample creators and media are illustrative.
- Creator evidence is self-declared, not independently certified.
- Match Studio uses deterministic matching; it does not train Gemini or perform external research.
- Public password-recovery delivery requires a verified email-sending domain.
- Delivery and revision coordination currently use conversations and campaign status.
- Payments, escrow, and independent licensing verification are not implemented.

## Documentation

- [Demo Script and Data Model](docs/HACKATHON_DEMO.md)
- [Production Setup](docs/PRODUCTION_SETUP.md)

Built for the **AI Content Creator Marketplace** hackathon challenge.

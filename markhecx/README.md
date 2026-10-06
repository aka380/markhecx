# MarkHECX — Phase 6

The existing Creator and Brand product now uses an Express API, MongoDB, and real cookie sessions. Phase 1–5 routes, visual tokens, animations, and shared UI remain in the same frontend. Previous implementation notes are retained in [docs/PHASE_5_REFERENCE.md](docs/PHASE_5_REFERENCE.md).

## Run locally

Requires Node.js 22.13+ and MongoDB with **replica-set transactions** (a local single-node replica set or a managed replica set). No external AI key is required.

```sh
npm run install:ci
cp server/.env.example server/.env
cp .env.example .env
mkdir -p .backend-data
mongod --dbpath .backend-data --bind_ip 127.0.0.1 --port 27018 --replSet markhecx
```

Keep MongoDB running in that terminal. In another terminal, initialize this dedicated local replica set once:

```sh
npm run backend:mongo:init
npm run backend:build
npm run backend:start
```

In another terminal:

```sh
npm run build
npm start -- --port 3001
```

Open **http://127.0.0.1:3001**. The API health endpoint is **http://127.0.0.1:4000/api/health**. Use `127.0.0.1` consistently for local cookie/CORS behavior. Development: `npm run backend:dev` and `npm run dev -- --port 3000`.

The database starts empty. Create a real Creator or Brand account with email and a password of at least 12 characters. There are no seeded credentials or automatic demo imports. Existing browser-only drafts are not automatically imported into an account. Clearly labeled sample showcases remain available under `/samples`; they are not real collaboration accounts.

## Try the full flow

1. Create a Creator account. Complete `/profile/edit`, add projects, and publish a **Public** portfolio from `/portfolio/builder`.
2. Sign out and create a Brand account. Complete `/brand/profile`, create a campaign at `/campaigns/new`, define requirements/deliverables, and publish.
3. Open `/campaigns/:id/matches`. Inspect score factors, evidence coverage, gaps, and explanations. Save a creator or send an invitation.
4. Sign in as the Creator. Check `/invitations` and `/notifications`, discover `/campaigns`, save a campaign, and apply with selected published evidence.
5. Sign in as the Brand to shortlist/accept/reject applications and message the applicant. Replies use `/messages`. Reload to check for new messages; WebSocket delivery and read receipts are not implemented.
6. Private portfolios are accessible only through the owner’s authenticated workspace. Unlisted portfolios work by link but do not appear in discovery. Draft edits do not change the published snapshot until republished.

Account roles are server-controlled. Sign out and sign in with the other account to change roles. Use separate browser profiles for simultaneous Creator/Brand sessions.

## Architecture

Existing UI → existing domain services → frontend API providers → Express routes/services → MongoDB.

- `components/mark/provider.tsx`: existing auth/workspace context, server session restoration, queued saves, rollback, account isolation and retry.
- `components/mark/marketplace/provider.tsx`: existing marketplace context backed by authenticated API commands.
- `lib/mark/api/`: cookie/CSRF transport and translation of immutable domain changes to explicit commands. Mutations are not automatically retried.
- `server/routes/`, `services/`, `models/`, `middleware/`, `controllers/`: API, domain orchestration, typed MongoDB collections, authentication/authorization, validation, logging and health.
- Creator records embed profile/skills/experience/education/achievements/projects/portfolio and a separate publication snapshot. Revision checks reject stale writes.
- Brand/campaign/application/invitation/conversation/preferences/notification collections use ownership scopes, unique indexes and MongoDB transactions. Notifications commit with their originating action.
- Campaign analytics count stored applications/invitations/statuses. Views, followers, audience measurements and performance are not invented.

## API surface

Canonical prefix `/api/v1`; `/api` is a compatibility alias.

| Area | Endpoints |
| --- | --- |
| Health | `GET /health` |
| Authentication | `POST /auth/register`, `/auth/login`, `/auth/logout`; `GET /auth/me` |
| Workspace | `GET/PUT /workspace`, `GET/PUT /profile` |
| Projects/achievements | `GET/POST /projects`, `/achievements`; `PUT/DELETE /projects/:id`, `/achievements/:id` |
| Portfolio | `GET/PUT /portfolio`; public `GET /public/portfolios/:username` |
| Discovery | `GET /creators`, `/creators/:id`, `/creators/username/:username` |
| Marketplace | `GET /marketplace`, `/marketplace/public`; `POST /marketplace/commands` |
| Brands/campaigns | `POST /brands`; `GET /brands/:username`; `GET/POST /campaigns`; `GET/PUT/DELETE /campaigns/:id` |
| Applications/invitations | `GET/POST /applications`, `/invitations`; transitions through marketplace commands |
| Saved records | `GET /saved-creators`, `/saved-campaigns`; changes through marketplace commands |
| HECX | `POST /hecx/analyze`, `/hecx/field`, `/hecx/campaign`; `GET /hecx/matches`, `/hecx/matches/:id` |
| Communication | `GET/POST /conversations`; `GET/POST /conversations/:id/messages`; `GET /notifications`; `PUT /notifications/:id/read` |

## HECX and evidence

The browser calls the authenticated HECX API. Server services load the actual account/publication/campaign context, invoke the `AIProvider` abstraction, and validate structured responses. The configured provider is **MockHECX**, a deterministic analysis provider; no external generative model is connected or claimed.

Campaign matching remains deterministic and separate from explanation generation. Scores use only known factors, expose factor weights/alignment/evidence and unknown-data coverage, and do not predict outcomes. Suggestions preserve Analyze → Suggest → Review → Accept/Edit/Reject → Apply. Publishing remains a separate explicit action.

An external provider can be injected in `server/services/hecx.ts`. Add its server-only credentials, provider provenance/schema support, and contract tests there; never put keys in `NEXT_PUBLIC_*` or UI code.

## Security and operational boundaries

- Passwords use salted scrypt. MongoDB stores hashes of opaque session tokens; browser session cookies are HttpOnly and SameSite=Lax, with Secure enabled in production. CSRF tokens stay in memory.
- Mutation requests require an allowed Origin and authenticated mutations require CSRF. An account header prevents an old tab from silently acting as a different account after a cookie switch.
- Exact CORS allowlist, Helmet, request/body/field limits, rate limits, session TTL and expiry checks, role/ownership checks, transaction-safe notifications and duplicate prevention.
- Request logs contain request ID/method/path/status/duration, not request bodies, passwords or cookies. Errors do not expose database internals.
- Configure `NODE_ENV=production`, HTTPS frontend origins, a private/authenticated MongoDB replica set, and the browser-visible API address before deployment. Host frontend/API on the same site for cookie compatibility; terminate TLS at a trusted reverse proxy.
- No deployment or push has been performed. Email verification/password recovery, external generative AI, object storage, real-time push, multi-instance shared rate-limit storage, and production monitoring/backups require deployment-specific work. Current embedded images and bounded collection reads suit the local full-stack implementation; pagination/object storage should precede large datasets.

## Verification

```sh
npx tsc --noEmit
npm run backend:build
npm run test:backend
npm run test:regression
npm run lint
npm run build
```

Backend tests require the running local replica set and force the dedicated `markhecx_test` database. They refuse to run against the application database. See [VERIFICATION.md](VERIFICATION.md) for coverage and verification limits.

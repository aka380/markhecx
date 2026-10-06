# Master production implementation report — 2026-10-07

## Root causes

1. The project MongoDB replica set on 27018, API on 4000 and frontend on 3001 were stopped. The unrelated system MongoDB was not the application database. Existing project data was reopened without a reset. `npm run start:local` now coordinates the local services and checks readiness; keep the launcher open.
2. The browser API default was an absolute loopback URL, making the deployment dependent on host/port/CORS configuration. The default is now `/api/v1` through the frontend server gateway, preserving HTTP-only cookies and the backend's Origin/CSRF checks. An explicit public API URL remains supported.
3. Auth restore existed but the shell could render signed-out controls before it finished. Loading and failure now block the shell separately; a failed restoration provides a real retry. Persistent cookie expiry and database sessions were already implemented and are preserved.
4. No Google Sign-In implementation or Google client configuration existed in this active checkout. The reported configuration message was not found in this checkout. Official GIS UI and Google Auth Library server verification are now wired into the existing authentication system.
5. Recovery email had no provider settings and therefore correctly reported unavailable. The previous asynchronous send also hid provider rejections from the requester. Delivery is now awaited, failed OTPs are invalidated, and safe errors propagate.
6. An unrelated untracked nested `markhecx/` copy exists. It was preserved and excluded from root TypeScript/lint traversal; it was not treated as a second application to update.

## Files and database changes

- Auth: `server/services/google.ts`, `server/routes/auth.ts`, `server/models/auth.ts`, `server/config/env.ts`, `server/services/auth.ts`, and `server/services/password-reset.ts`.
- Frontend: `components/mark/google-sign-in.tsx`, provider/shell/settings integration, `lib/mark/api/client.ts`, and `app/api/v1/[...path]/route.ts`.
- Portfolio/brief: creative schema, creative fields/public project display, Gemini brief schema and campaign review controls. Aspect ratio is now available on project capabilities; brief suggestions include title, objective, deliverables and timeline without silently saving.
- Operations/tests: environment examples, `scripts/start-local.mjs`, Google/security tests, dependency manifests and validation exclusions.
- MongoDB: optional user provider/Google subject/timestamps, unique partial Google-subject index, and hashed browser-bound challenge records with five-minute TTL. Existing users and marketplace records retain their IDs and relationships. D1/Drizzle remain unused starter scaffolding; no second product database was created.

## API and authentication

New backend routes under `/api/v1/auth`: `POST /google/challenge`, `POST /google`, `POST /google/link`. These share the existing session creation/cookie path and current-user/logout endpoints. Linking requires an authenticated CSRF-protected session with the matching email; matching an email alone does not link or overwrite an account. Existing roles are preserved.

Google verification checks signed ID tokens with the official library, then explicitly checks issuer, audience, expiry, issue time, subject, email verification and the browser-bound nonce. The nonce is single use, expires, and is stored hashed. No Google access/refresh tokens or client secret are requested or persisted. See [Google server verification](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token) and [GIS JavaScript reference](https://developers.google.com/identity/gsi/web/reference/js-reference).

Forgot-password/resend now await the existing Resend adapter. Both known and unknown addresses receive the same neutral challenge email, avoiding account-dependent delivery timing/errors. An unknown account cannot use it to reset any user. The per-email and per-IP controls remain in force. Provider rejection returns `503 email_unavailable` and removes that generation; there is no fake delivered response. OTPs, passwords, credentials and tokens are not logged. Tests verify provider rejection for both address cases.

## Required external setup

**Google — BLOCKED BY EXTERNAL CONFIGURATION**

- Create an OAuth consent screen in the correct Google Cloud project. Configure branding/audience and test users while in testing mode.
- Create an OAuth client of type **Web application**.
- Verified running frontend origin: `http://127.0.0.1:3001`. Add that exact authorized JavaScript origin. Add `http://localhost:3001` only if you will also use that browser address. For a separate development server on 3000, authorize its exact origin when used.
- This implementation uses GIS popup/FedCM with a JavaScript credential callback; it has **no OAuth redirect URI** and needs **no client secret**.
- Set `NEXT_PUBLIC_GOOGLE_CLIENT_ID` in root `.env.local`; set the matching `GOOGLE_CLIENT_ID` in `server/.env`. Never put a client secret into any public variable.
- Vinext's installed dotenv loader follows Next-style root `.env*` precedence and inlines `NEXT_PUBLIC_*` at build time. `server/.env` is not the frontend environment. Rebuild the frontend and restart the backend after configuration.
- Official [Google client setup](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid).

**Recovery email — BLOCKED BY EXTERNAL CONFIGURATION**

Set `EMAIL_PROVIDER`, `RESEND_API_KEY`, and `EMAIL_FROM` in ignored `server/.env`. Use the supported Resend provider and a verified sender/domain in that provider account. Restart the backend. No credential values were present, fabricated or requested in chat. Real provider acceptance and inbox receipt cannot be verified until configuration exists. The existing Gemini key remains server-only.

**API/runtime configuration**

`NEXT_PUBLIC_API_URL` may remain unset or use `/api/v1`. The frontend gateway's server-only `MARKHECX_API_URL` defaults to the local API at `http://127.0.0.1:4000/api/v1`. Production must configure the actual private upstream and HTTPS web origins. The local launcher is intentionally for the documented 27018/4000/3001 ports and existing local replica-set layout. It is not a production process supervisor.

## Verification matrix

| Feature | Status | Evidence / limit |
| --- | --- | --- |
| MongoDB, indexes, API health | PASS | Existing replica set reopened; health connected; real integration tests |
| Frontend API gateway | PASS | Actual running gateway health/campaign reads, signup and authenticated requests |
| Signup/login/logout/current user | PASS | Backend integration suite, gateway smoke and live full-stack transport smoke |
| Session persistence contract | PASS | HttpOnly, SameSite and expiry checked; fresh request context reused cookie; logout made it invalid |
| Browser refresh/reopen/hydration | BLOCKED BY EXTERNAL CONFIGURATION | Browser interaction access remains unavailable; HTTP evidence is not browser acceptance |
| Google signature/claims/nonce security | PASS | Official verifier with controlled RSA certificates; wrong signature/audience/issuer/expiry/nonce and unverified identity rejected |
| Google creation/reuse/linking | PASS | Isolated MongoDB tests, stable IDs and roles, preserved password hash, explicit authenticated linking |
| Real Google account selector/login | BLOCKED BY EXTERNAL CONFIGURATION | No OAuth client configured; not claimed tested |
| OTP/reset/password persistence | PASS | Real API/database tests with capture email, expiry/attempt/cooldown/reuse/session-revocation coverage |
| Email rejection propagation | PASS | Injected provider rejection reaches safe error and invalidates generated OTP for known/unknown addresses |
| Real email delivery/inbox receipt | BLOCKED BY EXTERNAL CONFIGURATION | Resend credentials and verified sender missing |
| Creator/portfolio/campaign persistence | PASS | Existing integration suite and real full-stack smoke; no user-data reset |
| Discovery/filtering/empty results | PASS | Database-backed search tests and live creator publication/filter flow |
| HECX/Gemini/brief/matching | PASS | Real Gemini status and authorized profile/brief/match smoke; structured validation and review boundaries |
| Verification indicators | PASS | Self-declared/unverified evidence is labeled; no independently verified tool/workflow claims invented |
| Tests | PASS | 27 backend + 86 regression = 113 tests |
| Lint / TypeScript / builds | PASS | Zero lint errors (five existing native-image warnings); both TypeScript checks/builds |
| HTTP route coverage | PASS | 44 frontend routes, 33 linked assets, unknown 404, health, public CORS and protected 401 |
| Secrets / existing data | PASS | No configured secrets in tracked source/browser bundles; env remains ignored; nested user copy preserved |

No full browser end-to-end certification or production deployment is claimed. Real Google login, real outbound email and browser interaction acceptance remain outstanding. New temporary smoke fixtures were removed by their exact generated IDs; existing user/creator/portfolio/campaign data was not deleted or reset.

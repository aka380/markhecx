# Production setup on Vercel

The frontend and Express API now deploy together through Next.js. `/api/v1/*` uses the existing controllers, authorization, validation, database models and secure cookies. No separate Express host or laptop connection is required. The old `MARKHECX_API_URL` gateway setting is no longer used. When omitted, the production origin and public Google client ID default to the existing MarkHECX site/client. Explicit environment values override those defaults.

## Environment variables

In the existing Vercel project, open Settings → Environment Variables. Select Production. Add these values, then redeploy the latest GitHub commit. Never place secrets in variables prefixed `NEXT_PUBLIC_`.

| Name | Value |
| --- | --- |
| `MONGODB_URI` | Your Atlas connection string, including a dedicated application database user's URL-encoded credentials. Use Atlas network access appropriate for your deployment. |
| `MONGODB_DATABASE` | `markhecx` |
| `WEB_ORIGINS` | `https://markhecx.vercel.app` (comma-separated exact HTTPS origins for any additional domains you control) |
| `GOOGLE_CLIENT_ID` | The Web Application OAuth client ID from Google Cloud |
| `HECX_PROVIDER` | `gemini` for live Gemini |
| `GEMINI_API_KEY` | Your server-side Google AI Studio key |
| `GEMINI_MODEL` | A Gemini model available to your project; the existing configured model is `gemini-3.5-flash-lite` |
| `EMAIL_PROVIDER` | `resend` |
| `RESEND_API_KEY` | Your Resend sending key |
| `EMAIL_FROM` | A sender address on a domain you have verified with Resend |

MongoDB must support replica-set transactions (Atlas does). A database user needs read/write and index creation on the application database. Initialization creates unique and expiry indexes; connections and initialization are reused on warm Vercel instances. Account and API rate limits use atomic MongoDB counters across instances.

## Google setup

Edit the matching OAuth Web client in Google Cloud. Add `https://markhecx.vercel.app` as an Authorized JavaScript origin (no path or trailing slash). For local development also add `http://127.0.0.1:3001` and `http://localhost:3001`. Check the consent screen audience/test-user restrictions before inviting other users. This app uses GIS ID tokens, not an authorization-code redirect; no client secret is needed for this flow. Tokens are verified on the server for signature, audience, issuer, expiry, verified email and a single-use browser-bound nonce. Existing password accounts require authenticated Google linking.

## Verify before launch

1. `/api/v1/health` must return status `ok` and database `connected`.
2. Open Sign Up in a normal browser. Create a test account, sign out, then sign in on a second device. Confirm the same workspace appears.
3. Complete a real Google sign-in on an authorized origin. The browser must receive an HttpOnly session cookie. Use Settings for account linking.
4. Request recovery mail for a controlled account and complete a reset. Confirm the old password and sessions no longer work. A Resend test sender does not demonstrate public email delivery.
5. Create a brief, publish it, apply from a different creator account, and verify both accounts see the intended records only.
6. Test a live Gemini request and inspect the provider label. Deterministic Match Studio remains explicitly separate from live model output.

An unavailable backend no longer signs anyone into browser-local demo storage. Existing browser demo data remains on the device; it is not automatically uploaded or merged into a real account. Public sample portfolios and Match Studio remain available while account services are offline.

## Local development and checks

`npm run dev` runs Next.js and the API together on port 3001, reading `server/.env`. A local MongoDB replica set is still required. `npm run build`, `npm run backend:build`, `npm run test:regression`, and `npm run test:backend` check the integrated application. Backend tests use the isolated `markhecx_test` database.


## GitHub release workflow

`.github/workflows/deploy-markhecx.yml` runs lint, frontend regressions, the matching benchmark, API type-check/bundling, and the Next.js production build on changes to main and pull requests. The connected Vercel Git integration deploys main. GitHub Actions does not need Cloudflare credentials or the retired `MARKHECX_API_URL` setting. These are independent checks: a Vercel deployment marked Ready does not itself confirm a GitHub Actions run passed.

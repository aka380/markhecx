# Full-stack integration audit

This pass extends the existing Phase 1–6 system; it does not introduce another application or database representation.

| Area | Existing implementation reviewed | Result |
| --- | --- | --- |
| Authentication | AppProvider, browser API client, auth routes/services/models, security middleware, Phase 6B/6H tests | Real cookie sessions, scrypt passwords, CSRF and account boundaries retained. Added credential-version checks for reset/login races. |
| Creator and portfolio | Workspace schema/migration, profile/project editors, public snapshots, creator routes/services and Phase 6C tests | MongoDB remains authoritative. Optional creative capabilities added to profiles and projects; public presentation distinguishes self-declarations from verification. |
| Marketplace | Campaign editor, shared commands, transaction service, campaign/application/invitation/conversation models, Phase 6D/6G | Existing CRUD and collaboration preserved. New brief fields persist through campaign and application snapshots. |
| Discovery | Discovery controls, public resource hook, projection and search helpers | Added database query filters and bounded pagination. Live discovery defaults to all creators, not sample-only featured flags. Sample pages remain explicitly separate. |
| HECX | Context builder, provider contracts, Gemini boundary, response validators, review/apply controls | Real Gemini retained; added structured editable brief drafts and authenticated single-candidate match explanations. Deterministic scores stay unchanged by the model. |
| Recovery | Existing login dialog lacked recovery | Added complete email → OTP → verification → reset → login UI/API flow with tests. Actual outbound email requires configured Resend credentials and a verified sender. |
| Notifications | Transactional application, invitation and message events; user-scoped notification endpoints | Existing persisted notification system retained and exercised by regression/integration tests. No synthetic analytics added. |
| Memory | Existing ephemeral conversation history | Added three explicit user-managed durable preferences. No automatic transcript storage, inferred credentials, or model training. |
| Database lifecycle | Replica-set initializer, startup connection/indexes, isolated test DB | Setup command now initializes all model indexes. Environment validation prohibits normal operation on the test DB. |

## New API surface

All paths below are under `/api/v1` (existing `/api` alias retained).

- `POST /auth/forgot-password`, `/auth/resend-reset-otp`, `/auth/verify-reset-otp`, `/auth/reset-password`.
- `GET /creators/search`: `q`, repeated `skill`, `identity`, `category`, `specialization`, `tool`, `contentType`, `platform`, `format`, `projects`, `portfolio`, `page`, `limit`.
- `POST /hecx/brief`: Brand-only `{prompt}`; returns an editable draft without persistence.
- `POST /hecx/match-explanation`: `{campaignId, creatorId}`; validates campaign ownership/public access and candidate visibility before a single-candidate provider call.
- `GET /hecx/memory`; `PUT/DELETE /hecx/memory/:key`, where key is `goal`, `preferredPlatform`, or `communicationStyle`.

No new page routes are needed. Recovery is part of the existing authentication dialog; brief editing, match explanations, creative fields and preferences extend existing screens.

## Data changes

- `password_resets`: scrypt-hashed six-digit codes, generation identifiers, attempts, cooldown/window counters, expiry, hashed single-use reset tokens. TTL cleanup and token uniqueness indexes. Verification and reset reject expired records before TTL cleanup.
- `hecx_memory`: at most three explicit user-owned keys, source `user`, timestamps, unique user/key index. Users can clear any preference.
- Optional `creative` fields on the existing profile/project and application evidence schemas. Missing fields preserve compatibility with existing records.
- Optional campaign `contentType`, `format`, `aspectRatio`, `tools`, `commercialUse`; existing creative direction/platform/budget fields are reused.
- Optional credential versions on users/sessions prevent a login racing a password reset from preserving access with old credentials.

## Recovery security and email setup

The implementation follows the relevant [OWASP recovery guidance](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html): equal request responses, cryptographic codes, limited attempts, expiry and single use. Codes expire after ten minutes, allow five attempts, enforce a sixty-second resend cooldown and five requests per email per hour. Reset tokens expire after ten minutes; password reset updates the password and revokes sessions in one MongoDB transaction. The new password must contain 12–128 characters.

Configure `EMAIL_PROVIDER=resend`, `RESEND_API_KEY` and a verified `EMAIL_FROM` in ignored `server/.env`; restart the backend. See the [Resend send API](https://resend.com/docs/api-reference/emails/send-email). Missing configuration returns a truthful unavailable state for every email. Provider delivery failures emit only a generic operational event, with no email/code/token/provider body logged. Dispatch is asynchronous to avoid account-dependent request latency; there is no durable mail queue/retry worker in this implementation.

Normal tests use an injected capture provider with a bounded in-memory mailbox, no public inbox route and no real deliveries. It is forbidden in production. The live full-stack smoke also captures recovery mail only in isolated test mode. No test OTP is returned by an API.

## Evidence and scale boundaries

Creative fields are self-declared. No tool, model, workflow, follower count, commercial license or portfolio item is marked independently verified. Gemini text remains a reviewable recommendation, not verification. Quote validation and numeric checks cannot prove every semantic claim.

Discovery filters query published records in MongoDB before pagination. Personal recommendation/relevance ordering continues within the fetched page. The older marketplace workspace and matching lists remain bounded (500 creators/1,000 campaign records); a larger production deployment needs cursor-based marketplace reads and server-wide ranking beyond these existing bounds. Media remains bounded embedded images/HTTPS links, not an object-storage upload service.

Local application verification is not an internet deployment/security certification. Production still requires TLS, authenticated private MongoDB, verified email delivery, operational monitoring/backups, shared rate limiting for multiple API processes, and the browser acceptance checks recorded in VERIFICATION.md.

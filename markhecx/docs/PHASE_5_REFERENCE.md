# MarkHECX — Phase 5

HECX contextual intelligence, creator discovery and search, profiles, projects, and customizable portfolios extending the existing React, TypeScript, Vinext, Radix/Shadcn MarkHECX foundation.

## Run locally

Requires Node.js 22.13 or later.

```sh
npm run install:ci
npm run dev -- --port 3000
```

```sh
npx tsc --noEmit
node scripts/test-phase1.mjs
node scripts/test-phase2.mjs
node scripts/test-phase3.mjs
node scripts/test-phase3-render.mjs
node scripts/test-phase4.mjs
node scripts/test-phase5.mjs
node scripts/test-phase5-render.mjs
npm run build
```

`npm start -- --port 3001` serves the built Worker locally. This is the verified production preview path. Development rendering also responds, but the first compilation can take around 50 seconds; allow it to finish before treating a short request timeout as a failure. The existing `.openai/hosting.json` records a private Site identity; no external deployment has been completed.

## Phase 5 Brand + Campaigns + HECX Matching

Creator and Brand / Agency accounts share the existing local sign-in and shell. Choose a role at sign-in or use **Switch to Brand / Agency / Creator** in the profile menu. Creator drafts remain intact when switching. Brand and Creator saved-creator lists are independent and use the same save operation.

### Try the connected flow

1. Sign in as Brand and complete `/brand/profile` (name and handle).
2. Create a campaign at `/campaigns/new`: basics → brief → requirements → budget/timeline → platforms/deliverables → review → publish. Drafts stay private to the Brand workspace.
3. Open campaign matches, filter/sort creators, inspect **Why this creator?**, save a creator, and review/send a local invitation.
4. Switch to Creator, browse `/campaigns`, inspect your evidence-based match, save the campaign, and submit an application with optional published projects and a public portfolio. No private project drafts are shared.
5. Switch to Brand to shortlist, accept/reject, inspect submitted evidence, and message the creator. Messages stay in the same `/messages` workspace and are visible to the local participants.
6. For multiple sample creators/application states, explicitly **Load demo campaigns** on the Brand dashboard after completing the brand profile. Imported examples are labeled demo data; no sample replies or business outcomes are generated.

### Routes and components

- `/brand`, `/brand/profile`, `/brand/analytics`, `/brand/saved`: dashboard, profile, record-derived analytics, and saved-creator organization.
- `/b/:username`: public brand profile and public campaigns.
- `/campaigns`, `/campaigns/saved`, `/campaigns/new`: discovery, saved campaigns, seven-step editor.
- `/campaigns/:id`, `/campaigns/:id/edit`, `/campaigns/:id/matches`: public detail/owner management, editing, and HECX creator matching.
- `/applications`, `/invitations`: role-specific tracking and review.
- `/messages`: extends the existing route with local campaign conversations; no separate messaging system.

`components/mark/marketplace/` contains the marketplace provider, campaign editor, dashboard/discovery/review pages, Messages, and shared CampaignCard, MatchAnalysis, InviteCreator, access gate, and confirmation controls. All reuse the existing Card/Button/Choice/Dialog/Sheet system. `phase5.css` extends existing tokens and animations, with desktop grids, tablet stacking, mobile single-column cards and bottom-sheet filters, and reduced-motion support.

### Data and intelligence architecture

`lib/mark/marketplace/models.ts` defines validated Brand, Campaign, CampaignRequirement, Deliverable, Application, Invitation, Conversation and marketplace state schemas, plus CreatorMatch and CampaignAnalytics contracts. Existing Creator/Profile/Project types and Phase 3 discovery data are reused.

`services.ts` holds campaign, brand, application, invitation, saved-creator organization, message and analytics services. Ownership and allowed transitions are checked here as well as in UI gates. `MarketplaceDataProvider` separates persistence; the current local provider uses `markhecx.marketplace.v1`. The existing creator repository remains separate. Submitted applications/invitations retain snapshots of shared campaign context so later private draft edits cannot appear through earlier records.

`matching.ts` computes weighted deterministic factors and filters/sorts results. `lib/mark/hecx/campaign.ts` separately produces evidence-only explanations and campaign suggestions. Match percentages use known factors only; every weight, alignment value, and evidence string is shown, along with evidence coverage and missing data. Budget, audience and platform compatibility remain unknown when creator measurements are absent. Scores do not predict outcomes. Suggestions require explicit Accept/Edit/Reject and never invent campaign facts.

### Backend integration boundary

Replace the local data provider with a Node.js/Express REST adapter and MongoDB persistence, then enforce the existing service ownership rules against server-authenticated identities. Real identity verification, cross-device publication, invitation/message delivery, external analytics and server-side AI remain unconnected. No fake network calls, provider keys, or automatic external delivery were added. Current analytics count actual local/demo records; views, reach, engagement, spend and conversions are unavailable.

## Phase 4 HECX

`/hecx` now hosts contextual chat and nine focused analysis modules. Existing navigation, cards, controls, dialogs, and layout tokens are reused. Module entry points use query parameters, for example `/hecx?module=Project%20Analysis&project=<id>` and `/hecx?module=Match%20Analyzer&creator=<id>&q=Python`.

- Profile, project, skill, achievement, creator identity, portfolio, career, match, and workload analyses produce validated structured current facts, strengths, gaps, recommendations, priority actions, and requests for missing information.
- A dedicated context builder selects authorized data and strips avatar/media bytes, location, activity, and saved lists. Public creator matching uses only the Phase 3 public dataset. Signed-out requests never receive owner context.
- `AIProvider` is replaceable. `MockHECXProvider` is deterministic and local; no secret keys or external AI calls are present. A future provider must run behind a secure server boundary.
- Every suggested modification uses the shared Accept/Edit/Reject dialog. An atomic local update checks source freshness and field constraints before applying. Portfolio changes remain separate from identity and never update published snapshots.
- Profile, project, portfolio, and discovery links enter the appropriate HECX module. Existing inline assistance now delegates to the same service/provider and shared review UI.
- Campaign requirements and workload estimates may be supplied explicitly for the current session. Missing audiences, budgets, mutual availability, deadlines, and capacity are not invented. No badges are awarded or career outcomes promised.
- Conversation context is bounded to 12 recent messages and six analyses. Refresh, leaving the workspace, sign-out, or New session discards this session context; accepted profile/project/portfolio changes retain existing local persistence.
- Invalid responses, unavailable providers, rate limits, cancellation, timeout, and stale suggestions have user-facing error handling. Requests occur only on explicit actions.

### Error corrections

The original four React state-effect lint errors were fixed in profile-state initialization, Create form reset, and search input/history synchronization. Generated runtime files are excluded from lint, unused imports were removed, suggestion requests cancel on unmount, and concurrent/stale acceptance does not report a false success.

The pre-existing development rendering timeout still reproduces under Node 26 and Node 24; static resources respond while application rendering stalls. A diagnostic Node-only development configuration did not resolve it and was reverted. Use `npm run build` followed by `npm start -- --port 3001` for the verified local preview. Five native-image optimization lint warnings remain; lint has zero errors.

## Phase 3 discovery

- `/creators`: instant search shared with the global search bar; keyboard-operable suggestions for creators, skills, categories, and projects; separate guest/owner recent submitted searches in session storage; data-backed suggested skills.
- Recommended, Featured, Trending, New Creators, All Creators, and Saved views. Signed-out visitors default to Featured; signed-in visitors default to Recommended. Empty recommendations guide users to add real source data.
- Categories and combined filters for skills (match all), creator identity, availability, stated experience, projects, and public portfolio availability. Unsupported metric sorts such as Most Viewed are omitted.
- Search/filter/sort state is in the URL. Canonical profile/portfolio links carry a validated discovery return path. `/creators/saved` also supports direct access.
- The existing CreatorCard now shows actual available fields, save state, source labels, profile/portfolio navigation, and Message/Invite controls. All restricted actions use the central local auth gate.
- `/profile/:username` reuses the Phase 2 profile content, including public project detail dialogs. `/u/:username` reuses the Phase 2 portfolio canvas for sample and local publications. Older creator/portfolio routes remain valid.
- Twelve clearly fictional sample creators live in one dataset. Optional dates, availability and experience are explicit sample metadata; there are no fabricated followers, analytics, AI percentages or credentials. Trending is labeled an editorial demo selection.
- Public local snapshots join the same search/filter/save pipeline. Private/unlisted snapshots and project drafts stay out of discovery. Public local content remains on this browser only.
- HECX recommendations use deterministic evidence from skills, exact identity, interests, categories, and technologies in published projects. The replaceable provider interface returns explanations; it makes no AI API calls.
- Invite opens a Campaign/Opportunity dialog with an honest empty state because no campaign records exist. Message links to the existing signed-in Messages placeholder with recipient context. Neither action claims delivery.
- Desktop/tablet/mobile grid rules and mobile bottom-sheet filters extend existing styles. Browser interaction and visual QA remain outstanding; see `VERIFICATION.md`.

## Preserved Phase 1 and Phase 2 features

- Existing shell, navigation, primitives, motion, sample discovery, and HECX workspace retained. Shared tokens match the specified black surfaces, pink actions, and purple HECX accents.
- `/profile` and `/profile/edit`: progressive identity, structured skill editing, optional photo, bio, tags, location, social links, experience, education, and achievements. Name, username, creator identity, and 3–5 unique skills are required; optional empty sections stay hidden.
- `/projects`, `/projects/new`, `/projects/:id`, and `/projects/:id/edit`: actual local project records, drafts, editing, images/video links, descriptions, problem/solution/contribution, technologies, tags, and external links. Only published projects enter the showcase.
- `/portfolio`, `/portfolio/builder`, and `/portfolio/preview`: linked source data, custom section content, toggles, reordering, featured projects, five layout templates, bounded appearance settings, live preview, saved drafts, and publication snapshots.
- `/u/:username`: local published snapshot with Public, Unlisted, and Private visibility. Public local creators appear in discovery; unlisted snapshots require a direct route; private snapshots require the local owner sign-in state.
- HECX assistance uses the shared service for local source-grounded suggestions with explicit Accept/Edit/Reject review. No external AI calls or silent updates.
- Desktop editor/preview split, stacked mobile layouts, preview tabs, and bottom-sheet controls implemented in shared styles. Final browser visual verification is outstanding.

## Data and boundaries

Profile is identity, portfolio is presentation, and HECX is assistance. Template, section, and featured-project changes do not alter source profile/project records. An explicit source-profile editor is separately labeled and saves only on confirmation. Publishing takes an independent snapshot; later drafts do not change it until republished.

The validated local repository uses `markhecx.phase2.v1`, with migration from Phase 1 preserving real profile and custom section data. Public sample creators remain separate from the local user. Image limits keep browser storage bounded: profile photo up to 700 KB; up to three project images of 300 KB each.

All account and publication behavior is a frontend simulation in one browser. Public/unlisted URLs do not transfer data to another device. Sign-out retains stored records; browser-data removal deletes them. Local visibility is not secure authorization. There is no server database, OAuth/JWT, AI API, payments, delivery backend, synchronization, or backup.

## Source map

- `app/`: routes and shared styles; `phase2.css` extends existing tokens.
- `components/mark/`: existing shell, shared controls, provider, and product pages.
- `components/mark/phase2/`: profile/project editing, portfolio rendering/controls, public views, HECX review.
- `lib/mark/models.ts`: backend-ready domain interfaces.
- `lib/mark/store.ts`: validated persistence, migration, URL validation.
- `lib/mark/domain.ts`: required-field validation, visible sections, ordering, publishing/access rules.
- `lib/mark/assistance.ts`: source-grounded field suggestion helper used by the mock provider.
- `lib/mark/hecx/`: context, provider contracts, deterministic analyses, service validation/error handling, and guarded application.
- `components/mark/hecx/`: reusable insights and approval dialog.
- `lib/mark/creator-search.ts`: shared searchable fields, category aliases, text matching.
- `lib/mark/discovery.ts`: types, adapters, filters, ranking, recommendation provider, suggestions, query parsing.
- `components/mark/discovery/`: shared search/filter/action controls and loading skeletons.
- `tests/phase1.test.ts`, `tests/phase2.test.ts`, and `tests/phase3*.test.*`: regression and server-markup checks. Rendering tests stub routing and do not simulate browser interaction.

See `VERIFICATION.md` for evidence and remaining QA limitations.

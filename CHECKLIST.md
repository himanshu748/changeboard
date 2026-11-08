# Changeboard implementation and evidence

Updated 8 November 2026. October implementation remains pre-window work. Checked means only the stated evidence was observed; hosted sample, provider reads and live repairs are separate boundaries. [Verification](docs/verification.md) and [API record](docs/api-verification.md) distinguish deterministic, simulated and live evidence.

| ID | Phase / requirement | Status | Implementation | Verification / evidence | Remaining limitation |
|---|---|---|---|---|---|
| DOC-01 | Preserve PRD; design before UI | [x] Observed | PRD.md, design.md | Files saved before components | None |
| DOC-02 | Current API/competition record | [x] Documentation verified | docs/api-verification.md, docs/build-log.md | Official Buffer sources | Live contract behavior separate |
| FR-01 | Ordinary account PKCE/org/isolation | [ ] OAuth verified; robustness incomplete | src/buffer/oauth.ts, src/server/connections.ts | 24 adapter/connection simulations; first real OAuth and 6 live read receipts | Optional second account; live refresh/revocation |
| FR-02 | Bounded existing-post import | [ ] Empty and one-fixture imports verified; wider coverage incomplete | src/buffer/client.ts, src/server/app.ts, src/client | Owned Page, 20-post bound, HTTP 200/zero posts; immediate refresh regression | One text caption verified; other assets/schedules and pagination remain untested |
| FR-03 | Exact association confirmation/manual controls | [x] Locally verified | src/domain/bindings.ts, src/client/App.tsx | Domain tests; six browser-confirmed phrases | AI extraction explicitly unavailable |
| FR-04 | Precise preview/selected operations | [x] Locally verified | src/domain/repair.ts, src/server/service.ts | Complete captions, excluded operations, stale approvals and one verified live draft repair | Other provider payloads remain unverified |
| FR-05 | Persist/reuse associations after change | [x] Locally verified | src/server/worker.ts, src/domain | Browser River → Garden change and reload; SQL tests | Live verified rebase pending |
| FR-06 | Revision-bound images and poster/upload | [x] Local path verified | src/server/assets.ts, src/client | Poster preview/acknowledgement; upload/retention tests | Hosted fictional PNG fetched over HTTPS; Buffer media fetch unverified |
| FR-07 | Immutable approved change set | [x] Local execution verified | src/server/service.ts, worker.ts | Tamper/stale/duplicate/owner tests | No remote atomicity/exactly-once guarantee |
| FR-08 | Partial/skipped/uncertain recovery | [x] Locally verified | worker.ts, Results/ResultRow | 12 worker tests; persisted browser skips; latest outcome/history | Remote unknowns remain uncertain |
| FR-09 | Separate reviewed correction draft | [ ] Local path verified; live blocked | BufferClient.createCorrectionDraft, service, UI | Browser sample draft; SQL/API/adapter tests | Live Facebook receipt; Instagram image correction withheld |
| TIME-01 | DST/floating/offset/cutoff | [x] Deterministically verified | src/domain/time.ts, validation.ts | 33 domain tests; browser relative consequence | Live schedules unverified; draft scheduling withheld |
| SEC-01 | Token encryption/refresh/CSRF/ownership | [x] Local controls verified | connections.ts, app.ts, Buffer OAuth | Refresh locks, revoke simulation, A→B→A isolation, CSRF | Hosted auth/security review still required |
| DATA-01 | SQL records/migrations/persistence | [x] Locally verified | migrations/, db.ts, service.ts | PGlite integration; PostgreSQL hosted sample and restart persistence | PostgreSQL 17.11 hosted sample/restart passed; same-host restoration passed; off-host recovery pending |
| UX-01 | Four screens/responsive/keyboard/motion | [x] Targeted browser checks passed | src/client, outputs/screenshots | 1440 and375 widths, Tab/Enter/Escape, reduced motion | No complete WCAG certification or physical-device claim |
| LIVE-01 | One ordinary account deployed OAuth and restart persistence | [x] Verified 8 November | docs/deployment.md | outputs/deployed-oauth-evidence.json: exact callback, six fresh HTTP 200 reads, one encrypted connection and selected organization retained, fresh reads after restart | One account sufficient for this sprint; refresh/revocation and independent-account testing remain unverified |
| LIVE-02 | One scoped Facebook text-draft repair | [x] Verified 8 November | Scope checked in preview and Buffer adapter | outputs/live-draft-repair-evidence.json: one real app repair, pre-write re-fetch/readback, draft preserved, restart retained | Only the validated fixture/channel; scheduling, other drafts, images and correction creation remain disabled |
| RELEASE-01 | README/env/privacy/deployment docs | [x] Prepared | README.md, .env.example, docs | Local run/build instructions checked; public /privacy route | Stable HTTPS app/privacy/health verified; deployed OAuth/restart passed |
| RELEASE-02 | Working ≤2min live demo / overview | [x] Demo produced; submission pending | public/demo.html, outputs/demo-video-evidence.json, submission-overview.md | 114-second captioned edited walkthrough of the real repair; 306-word overview | Final terms acceptance and submission remain pending |
| VALID-01 | Observed users/manual baseline | [ ] Skipped by owner for this submission | docs/verification.md | No participants or findings claimed | Demand, willingness to pay and time savings remain unvalidated |

## Required verification mapping (PRD §12)

1–2: connection/OAuth simulations and historical first live OAuth passed; current-host OAuth/restart passed (one account sufficient). 3–8: deterministic domain tests passed. 9–13: SQL/HTTP/worker simulations passed; sample browser conflict/partial/reload passed. 14: sample/browser + adapter correction passed; live correction creation remains blocked by the installed scope. 15: deterministic + browser second change passed. 16: desktop/mobile browser, keyboard and refresh checks passed locally.

## Phase gates

- Phase 1: documentation/scaffold/database/first live OAuth verified; deployed one-account OAuth and restart exit **passed**.
- Phase 2: owned-channel discovery and bounded empty import and one real text-draft import **passed live**; broader content and pagination remain unverified.
- Phase 3: deterministic associations and repeated-change exit **passed locally**.
- Phase 4: comprehensible caption/time/image/conflict review **passed locally**.
- Phase 5: durable executor, partial/uncertain recovery **passed simulated/local tests**; one scoped live caption repair **passed**; live conflict and uncertain-outcome paths remain unverified.
- Phase 6: local accessibility/mobile/docs/asset drafts prepared; hosted sample **passed**; deployed OAuth/restart **passed**; user testing **skipped by owner**; 114-second captioned demo **produced**; final terms/submission **pending**.

Registration is confirmed completed by the owner. The 114-second captioned live demo is produced; final terms acceptance/submission and broader live formats remain pending/unverified. This checklist records evidence, not contest eligibility.

## 8 November 2026 — scoped additions

- [x] Repair report: proposal/outcome separation, skipped/uncertain warnings, literal caption rendering; four behavior tests and an HTTP/SQL download/ownership/no-mutation test.
- [x] First-use guidance: per-stage sample task, sample apply label, repeat-venue example, usable connection explanation when OAuth is unconfigured, early warning for disabled live write formats.
- [x] Earlier local validation: 84 tests, TypeScript/production build, 1440px/375px Chromium walkthrough, keyboard/reduced-motion checks, report downloads and persisted partial sample result.
- [x] Current official requirements mapped in [judge walkthrough](docs/judge-walkthrough.md); November additions separated in [build log](docs/build-log.md).
- [x] One nonempty live text-draft import and repair; the existing grant sufficed without new Meta permissions. Independent-account testing remains optional future robustness work.
- [x] Durable public app, PostgreSQL, HTTPS/privacy/public fictional media and hosted sample restart persistence.
- [x] Clean clone install, typecheck, 96 tests and production build. Existing test files were unchanged. Read-receipt projections exclude raw provider payloads.
- [x] Deployed OAuth connection/restart proof: existing client callback/privacy saved; six fresh live read receipts; encrypted connection and organization retained; fresh reads after restart.
- [x] Produced 114-second captioned live demo; owner completed registration. Final terms acceptance/submission remain pending.

This evidence clears only the named one-draft repair check. Other live formats, scheduling/publishing, correction creation, live conflicts and off-host recovery remain unverified; user testing skipped by owner.

## Judge-access and submission preflight

- [x] Public judge guide with sample/live evidence boundaries and visible scope limits; app footer and README links.
- [x] Same-host isolated PostgreSQL restoration: nine tables, schema/constraints/indexes, verified live operation and encrypted credentials checked; no provider calls or production restore.
- [x] Submission package and private client-ID handoff prepared. Owner registration confirmed and official submission form unlocked.
- [ ] Final terms acceptance and submit action; no submission confirmation yet.
- [ ] Future availability through judging and off-host disaster recovery remain ongoing/unverified.
- [ ] User testing skipped for this submission at owner request.

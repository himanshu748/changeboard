# Changeboard implementation and evidence

Updated 8 November 2026. October implementation remains pre-window work. Checked means only the stated evidence was observed; hosted sample, provider reads and live repairs are separate boundaries. [Verification](docs/verification.md) and [API record](docs/api-verification.md) distinguish deterministic, simulated and live evidence.

| ID | Phase / requirement | Status | Implementation | Verification / evidence | Remaining limitation |
|---|---|---|---|---|---|
| DOC-01 | Preserve PRD; design before UI | [x] Observed | PRD.md, design.md | Files saved before components | None |
| DOC-02 | Current API/competition record | [x] Documentation verified | docs/api-verification.md, docs/build-log.md | Official Buffer sources | Live contract behavior separate |
| FR-01 | Ordinary account PKCE/org/isolation | [ ] OAuth verified; robustness incomplete | src/buffer/oauth.ts, src/server/connections.ts | 24 adapter/connection simulations; first real OAuth and 6 live read receipts | Optional second account; live refresh/revocation |
| FR-02 | Bounded existing-post import | [ ] Empty live result verified; content coverage blocked | src/buffer/client.ts, src/server/app.ts, src/client | Owned Page, 20-post bound, HTTP 200/zero posts; immediate refresh regression | Nonempty captions/assets/schedules and pagination remain untested |
| FR-03 | Exact association confirmation/manual controls | [x] Locally verified | src/domain/bindings.ts, src/client/App.tsx | Domain tests; six browser-confirmed phrases | AI extraction explicitly unavailable |
| FR-04 | Precise preview/selected operations | [x] Locally verified | src/domain/repair.ts, src/server/service.ts | Complete captions, excluded operations and stale approvals | Provider payload acceptance pending |
| FR-05 | Persist/reuse associations after change | [x] Locally verified | src/server/worker.ts, src/domain | Browser River → Garden change and reload; SQL tests | Live verified rebase pending |
| FR-06 | Revision-bound images and poster/upload | [x] Local path verified | src/server/assets.ts, src/client | Poster preview/acknowledgement; upload/retention tests | Hosted fictional PNG fetched over HTTPS; Buffer media fetch unverified |
| FR-07 | Immutable approved change set | [x] Local execution verified | src/server/service.ts, worker.ts | Tamper/stale/duplicate/owner tests | No remote atomicity/exactly-once guarantee |
| FR-08 | Partial/skipped/uncertain recovery | [x] Locally verified | worker.ts, Results/ResultRow | 12 worker tests; persisted browser skips; latest outcome/history | Remote unknowns remain uncertain |
| FR-09 | Separate reviewed correction draft | [ ] Local path verified; live blocked | BufferClient.createCorrectionDraft, service, UI | Browser sample draft; SQL/API/adapter tests | Live Facebook receipt; Instagram image correction withheld |
| TIME-01 | DST/floating/offset/cutoff | [x] Deterministically verified | src/domain/time.ts, validation.ts | 33 domain tests; browser relative consequence | Live schedules unverified; draft scheduling withheld |
| SEC-01 | Token encryption/refresh/CSRF/ownership | [x] Local controls verified | connections.ts, app.ts, Buffer OAuth | Refresh locks, revoke simulation, A→B→A isolation, CSRF | Hosted auth/security review still required |
| DATA-01 | SQL records/migrations/persistence | [x] Locally verified | migrations/, db.ts, service.ts | PGlite integration; PostgreSQL hosted sample and restart persistence | PostgreSQL 17.11 hosted sample/restart passed; backup restoration pending |
| UX-01 | Four screens/responsive/keyboard/motion | [x] Targeted browser checks passed | src/client, outputs/screenshots | 1440 and375 widths, Tab/Enter/Escape, reduced motion | No complete WCAG certification or physical-device claim |
| LIVE-01 | One ordinary account deployed OAuth and restart persistence | [x] Verified 8 November | docs/deployment.md | outputs/deployed-oauth-evidence.json: exact callback, six fresh HTTP 200 reads, one encrypted connection and selected organization retained, fresh reads after restart | One account sufficient for this sprint; refresh/revocation and independent-account testing remain unverified |
| LIVE-02 | Live FB/Instagram format receipts | [ ] blocked - write authorization not granted | liveEvidence / BufferClient gate | Zero live write calls; all live formats disabled | Existing Meta grant is read-only; no new permission or fixture operation authorized |
| RELEASE-01 | README/env/privacy/deployment docs | [x] Prepared | README.md, .env.example, docs | Local run/build instructions checked; public /privacy route | Stable HTTPS app/privacy/health verified; deployed OAuth/restart passed |
| RELEASE-02 | Working ≤2min live demo / overview | [ ] Current-state assets prepared | outputs/demo-script.md, submission-overview.md | 110-second current-state script; ~300–400-word overview | Live video not recorded; no submission |
| VALID-01 | Three observed users/manual baseline | [ ] Blocked | docs/verification.md | NOT RUN | Participants unavailable; willingness-to-pay unvalidated |

## Required verification mapping (PRD §12)

1–2: connection/OAuth simulations and historical first live OAuth passed; current-host OAuth/restart passed (one account sufficient). 3–8: deterministic domain tests passed. 9–13: SQL/HTTP/worker simulations passed; sample browser conflict/partial/reload passed. 14: sample/browser + adapter correction passed; live gate blocked. 15: deterministic + browser second change passed. 16: desktop/mobile browser, keyboard and refresh checks passed locally.

## Phase gates

- Phase 1: documentation/scaffold/database/first live OAuth verified; deployed one-account OAuth and restart exit **passed**.
- Phase 2: owned-channel discovery and bounded empty import **passed live**; nonempty post comparison/pagination **blocked by no posts**.
- Phase 3: deterministic associations and repeated-change exit **passed locally**.
- Phase 4: comprehensible caption/time/image/conflict review **passed locally**.
- Phase 5: durable executor, partial/uncertain recovery **passed simulated/local tests**; live write gate **blocked**.
- Phase 6: local accessibility/mobile/docs/asset drafts prepared; hosted sample **passed**; deployed OAuth/restart **passed**; user validation and recorded video remain **unverified**.

The entire project is not complete while these core live gates remain blocked.

## 8 November 2026 — scoped additions

- [x] Repair report: proposal/outcome separation, skipped/uncertain warnings, literal caption rendering; four behavior tests and an HTTP/SQL download/ownership/no-mutation test.
- [x] First-use guidance: per-stage sample task, sample apply label, repeat-venue example, usable connection explanation when OAuth is unconfigured, early warning for disabled live write formats.
- [x] Current local validation: 84 tests, TypeScript/production build, 1440px/375px Chromium walkthrough, keyboard/reduced-motion checks, report downloads and persisted partial sample result.
- [x] Current official requirements mapped in [judge walkthrough](docs/judge-walkthrough.md); November additions separated in [build log](docs/build-log.md).
- [ ] Nonempty live repair: blocked - write authorization not granted. Independent-account validation is optional and not pursued in this sprint.
- [x] Durable public app, PostgreSQL, HTTPS/privacy/public fictional media and hosted sample restart persistence.
- [x] Clean clone install, typecheck, 86 tests and production build. Read-receipt projections exclude raw provider payloads.
- [x] Deployed OAuth connection/restart proof: existing client callback/privacy saved; six fresh live read receipts; encrypted connection and organization retained; fresh reads after restart.
- [ ] Recorded ≤2-minute video and entrant-owned registration/submission. No completion claimed.

These additions do not clear the original live release gates.

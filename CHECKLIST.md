# Changeboard implementation and evidence

25 October 2026 · pre-window work. Checked means the stated **local** acceptance was observed; full live requirements remain unchecked. [Verification](docs/verification.md) and [API record](docs/api-verification.md) distinguish deterministic, simulated and live evidence.

| ID | Phase / requirement | Status | Implementation | Verification / evidence | Remaining limitation |
|---|---|---|---|---|---|
| DOC-01 | Preserve PRD; design before UI | [x] Observed | PRD.md, design.md | Files saved before components | None |
| DOC-02 | Current API/competition record | [x] Documentation verified | docs/api-verification.md, docs/build-log.md | Official Buffer sources | Live contract behavior separate |
| FR-01 | Ordinary account PKCE/org/isolation | [ ] Implemented; live blocked | src/buffer/oauth.ts, src/server/connections.ts | 24 adapter/connection simulations; first real OAuth and 6 live read receipts | Second account; live refresh/revocation |
| FR-02 | Bounded existing-post import | [ ] Empty live result verified; content coverage blocked | src/buffer/client.ts, src/server/app.ts, src/client | Owned Page, 20-post bound, HTTP 200/zero posts; immediate refresh regression | Nonempty captions/assets/schedules and pagination remain untested |
| FR-03 | Exact association confirmation/manual controls | [x] Locally verified | src/domain/bindings.ts, src/client/App.tsx | Domain tests; six browser-confirmed phrases | AI extraction explicitly unavailable |
| FR-04 | Precise preview/selected operations | [x] Locally verified | src/domain/repair.ts, src/server/service.ts | Complete captions, excluded operations and stale approvals | Provider payload acceptance pending |
| FR-05 | Persist/reuse associations after change | [x] Locally verified | src/server/worker.ts, src/domain | Browser River → Garden change and reload; SQL tests | Live verified rebase pending |
| FR-06 | Revision-bound images and poster/upload | [x] Local path verified | src/server/assets.ts, src/client | Poster preview/acknowledgement; upload/retention tests | Public HTTPS media fetch unverified |
| FR-07 | Immutable approved change set | [x] Local execution verified | src/server/service.ts, worker.ts | Tamper/stale/duplicate/owner tests | No remote atomicity/exactly-once guarantee |
| FR-08 | Partial/skipped/uncertain recovery | [x] Locally verified | worker.ts, Results/ResultRow | 12 worker tests; persisted browser skips; latest outcome/history | Remote unknowns remain uncertain |
| FR-09 | Separate reviewed correction draft | [ ] Local path verified; live blocked | BufferClient.createCorrectionDraft, service, UI | Browser sample draft; SQL/API/adapter tests | Live Facebook receipt; Instagram image correction withheld |
| TIME-01 | DST/floating/offset/cutoff | [x] Deterministically verified | src/domain/time.ts, validation.ts | 33 domain tests; browser relative consequence | Live schedules unverified; draft scheduling withheld |
| SEC-01 | Token encryption/refresh/CSRF/ownership | [x] Local controls verified | connections.ts, app.ts, Buffer OAuth | Refresh locks, revoke simulation, A→B→A isolation, CSRF | Hosted auth/security review still required |
| DATA-01 | SQL records/migrations/persistence | [x] Locally verified | migrations/, db.ts, service.ts | Actual PGlite SQL; refresh and process persistence | Production PostgreSQL/backup rehearsal pending |
| UX-01 | Four screens/responsive/keyboard/motion | [x] Targeted browser checks passed | src/client, outputs/screenshots | 1440 and375 widths, Tab/Enter/Escape, reduced motion | No complete WCAG certification or physical-device claim |
| LIVE-01 | Second ordinary account deployed OAuth | [ ] Blocked | docs/live-validation.md | NOT RUN | Durable hosting and second account |
| LIVE-02 | Live FB/Instagram format receipts | [ ] Blocked; writes disabled | liveEvidence / BufferClient gate | NOT RUN | Future fixtures, live-operation approval; current Meta grant is read-only |
| RELEASE-01 | README/env/privacy/deployment docs | [x] Prepared | README.md, .env.example, docs | Local run/build instructions checked; public /privacy route | Temporary HTTPS endpoint verified; durable hosting pending |
| RELEASE-02 | Working ≤2min live demo / overview | [ ] Draft assets prepared | outputs/demo-script.md, submission-overview.md | 116-second script; ~300-word overview | Live video not recorded; no submission |
| VALID-01 | Three observed users/manual baseline | [ ] Blocked | docs/verification.md | NOT RUN | Participants unavailable; willingness-to-pay unvalidated |

## Required verification mapping (PRD §12)

1–2: connection/OAuth simulations and first live OAuth passed; second-account gate blocked. 3–8: deterministic domain tests passed. 9–13: SQL/HTTP/worker simulations passed; sample browser conflict/partial/reload passed. 14: sample/browser + adapter correction passed; live gate blocked. 15: deterministic + browser second change passed. 16: desktop/mobile browser, keyboard and refresh checks passed locally.

## Phase gates

- Phase 1: documentation/scaffold/database/first live OAuth verified; deployed second-account OAuth exit **blocked**.
- Phase 2: owned-channel discovery and bounded empty import **passed live**; nonempty post comparison/pagination **blocked by no posts**.
- Phase 3: deterministic associations and repeated-change exit **passed locally**.
- Phase 4: comprehensible caption/time/image/conflict review **passed locally**.
- Phase 5: durable executor, partial/uncertain recovery **passed simulated/local tests**; live write gate **blocked**.
- Phase 6: local accessibility/mobile/docs/asset drafts prepared; live release, user validation and working provider video **blocked**.

The entire project is not complete while these core live gates remain blocked.

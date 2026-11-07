# Verification record

25 October 2026 · local implementation · pre-window work.

## Automated checks actually run

`npm test -- --maxWorkers=1`: **79 tests passed in five files**. The latest consolidated run took 40.41 seconds.

| Layer | Count | Evidence boundary |
|---|---:|---|
| Deterministic domain | 33 | Exact UTF-16 spans, duplicates/overlaps, literal preservation, repeat repairs, calendar/DST behavior, floating/draft constraints, cutoff and format gates |
| Buffer adapter | 16 | Simulated HTTP/GraphQL/token responses; no provider acceptance claim |
| Connection integration | 8 | Actual local PostgreSQL engine, simulated provider; refresh locking/rotation, rate cooldown, ownership and A→B→A account isolation |
| HTTP/server integration | 10 | Actual ephemeral local Express server and SQL; CSRF/ownership, immutable approvals, sample repair/repeat, partial results, corrections |
| Worker recovery/integrity | 12 | Simulated gateway + actual SQL; successful-write/failed-verification ambiguity, leases, stale completion fencing, metadata integrity, conservative reconciliation |

`npm run build` passed TypeScript strict checking and Vite production compilation. A final build after the results UI refinements is recorded in the handoff. `npm audit` reported zero known vulnerabilities after pinning the patched test runner and formatter. This is a point-in-time dependency advisory result, not a security guarantee.

Database migration was exercised in real PGlite-backed integration tests. PostgreSQL production pooling, multiple deployed processes, hosted backup/restore and public asset fetching have not been live tested. PGlite cold startup was slow under concurrent host load; consolidated database suites run with one worker.

## Real browser evidence

Initial inspection used the in-app browser at 1440 × 1000. An isolated installed Chromium completed the full local journey via Playwright CLI. Screenshots are in `outputs/screenshots/`.

Observed desktop journey:

1. Select the three existing fictional posts and a separate published announcement.
2. Confirm source facts and six exact associations.
3. Change Saturday 21 November / 18:00 / Mill Studio to Sunday 22 November / 16:00 / River Studio.
4. Inspect full before/after captions, with untouched surrounding writing.
5. Generate the updated poster, view it, and explicitly acknowledge it for this revision.
6. Confirm the fixed time for the relative post: “Tomorrow” becomes “In 2 days” while its publication time stays fixed.
7. Simulate an external edit on the third independently persisted remote post. The preview withholds it and shows original/current/proposed versions.
8. Apply exactly one eligible post. Observe one verified sample result and two skipped posts with explicit “Still scheduled in sample” warnings. Reload retains these outcomes.
9. Save/review the correction and create a new sample draft. The separate result verifies the draft and states that the original published announcement was unchanged.

Observed mobile/repeat journey at 375 × 812:

- Document width and scroll width were both 375px on review and results (no horizontal overflow).
- Reduced-motion media query active; sampled row animation duration `0s`.
- Change River Studio to Garden Studio. Confirmed associations were reused without another binding confirmation. The baseline showed River Studio and the new proposal Garden Studio.
- The image became unresolved for the new revision and required a new poster acknowledgement.
- Apply by Enter on the action button. Garden Studio persisted after reload.
- Eight sequential Tab stops had a solid 3px outline and remained in the viewport; settings opened with Enter and closed with Escape.
- Current results show latest outcome per post; older receipts remain in collapsed history. Skipped unresolved work counts toward attention.

No errors were shown in the application alerts during the completed journeys. A favicon 404 was fixed. Development HMR disconnect messages occurred during deliberate server restarts; they are not provider errors. An initial browser-script assertion expected the correction button to remain mounted; the app correctly replaced it with a separate verified correction result, which the corrected check observed.

## Design comparison

The implemented introduction, fact sheet, four-step navigation, paired full-caption comparisons, revision-scoped media, separate correction and individual outcomes follow design.md. The 375px layout stacks comparisons and preserves the action area. Focus scroll padding prevents the sticky action area from hiding keyboard-targeted controls.

Material design/implementation decisions: deterministic extraction suggestions are used because no AI extraction service is configured; AI remains labeled unavailable. Public PNG assets are served from durable database records at immutable URLs rather than a separate object store. Sample conflict uses a persisted simulated remote source; it is not a live Buffer conflict receipt. Live Instagram text-only correction is withheld because its required image has not been separately reviewed and verified.

This is a targeted accessibility walkthrough, not a full WCAG conformance audit. No screen-reader user session, physical mobile-device performance test, or three-user usability study was conducted.

## Live provider evidence and current external blockers

On 25 October the user authorized a temporary HTTPS tunnel and private Buffer client creation, then separately approved account access for read-only verification. Buffer's email gate had already cleared; Gmail was not accessed. The client was created with account-read, post-read and post-write. Credentials were stored in ignored mode-0600 `.env.integration`; an opaque UI copy/paste transferred the secret without displaying or logging its value.

The real authorization-code/PKCE flow and client-secret token exchange succeeded. The resulting grant has `account:read`, `posts:read`, `posts:write`, and `offline_access`. The owner then approved a restricted Meta grant for the Himanshu jha Page only: public profile, Page listing and Page-content reads. Buffer accepted the channel connection. Six real GraphQL reads (account three times, channels twice, posts once) returned HTTP 200. The one connected Facebook Page is unlocked/connected and uses Asia/Kolkata. The posts request was limited to 20, scoped to that Page and draft/scheduled/sent statuses; it returned zero posts, hasNextPage=false and a null cursor. Buffer’s Queue/Drafts/Sent UI also showed zero. Tokens are encrypted in a separate local integration database. The connection and selected organization survived a clean server restart and browser reload. No live post mutation or queued operation occurred, and all live write formats remain disabled.

The production-mode app and public privacy page were served through the temporary Cloudflare HTTPS tunnel. Browser sample entry, Secure/HttpOnly/SameSite cookies, no-store API responses, CSP/frame/nosniff headers and absence of exposed configuration/server source were checked. This is not durable production hosting or a complete security audit. Redacted receipts and operational limitations are in `outputs/live-setup-evidence.json` and `outputs/LIVE-SETUP.md`.

An HTTP/SQL regression exposed a five-minute cache hiding newly connected channels during explicit organization refresh. It failed before the one-line fix and passed afterward; the full 79-test suite and production build passed. Explicit organization selection now refreshes account/channel discovery. The live Page was then discovered through that UI action and the empty import persisted after a restart.

Remaining inputs: existing nonempty Buffer posts for content/pagination reads; separately reviewed/authorized live fixture operations, a second ordinary test account, durable hosting/PostgreSQL/public media, live refresh/revocation and media behavior, a working provider video and observed user validation. No paid service, upgrade, payment method, external publication or contest submission occurred.

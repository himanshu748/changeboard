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

## 8 November 2026 — hosted release verification

Runtime `5151595d1eefe7882f6b186d6812fa00969eabf0` is deployed at https://changeboard.52.202.25.181.sslip.io with Node v22.23.4 and PostgreSQL 17.11. HTTPS `/`, `/health`, `/privacy` and the fictional poster returned 200 with certificate verification enabled. The sample required no login. Caddy retained other site routes, and other container states were unchanged.

Isolated Chromium completed the hosted sample: three selected posts, six confirmed phrases, only venue changed Mill Studio → River Studio (November 21 / 18:00 unchanged), generated poster visually inspected and acknowledged, third-post simulated source conflict, exactly one verified fictional update and two skips. A saved report retained the distinction. At 375×812, scroll width remained 375; reduced motion was enabled, Enter applied the update, and Settings opened by keyboard and closed by Escape. No application alert appeared.

Restarting only `changeboard-app` at 07:14:32 UTC preserved one campaign, three operations (one succeeded, two skipped) and the browser result. There were zero encrypted connections: this is **sample persistence**, not deployed OAuth persistence. A separate 07:26 UTC restart verified ordinary deployed OAuth: the existing callback/privacy URL were saved in Buffer; one encrypted connection and selected organization remained unchanged; the browser stayed connected, and fresh account/channel reads succeeded. Six November provider reads returned HTTP 200 with no GraphQL errors; the bounded post read returned zero posts. See [OAuth evidence](../outputs/deployed-oauth-evidence.json). LIVE-02 is **blocked - write authorization not granted**; zero live post mutations and zero enabled formats.

A fresh clone at runtime commit 5151595 passed `npm ci`, `npm run typecheck`, `npm test -- --maxWorkers=1` (86 tests) and `npm run build`. Existing suites were retained. Two added tests exercise credential-free read-receipt projection, including exclusion of raw response/request material and malformed post counts. Hosted backup restoration, multi-process load, live refresh/revocation and Buffer fetching public media remain untested. See [deployment evidence](../outputs/deployment-evidence.json), [runbook](deployment.md) and [build log](build-log.md). Historical October evidence above is unchanged.

The staged known-pattern credential scan found no matches; it omitted the PNG because it is binary. That fictional screenshot was visually reviewed, and exact configured credential bytes were absent from all tracked files (including the image) and reachable historical blobs. This is a bounded disclosure check, not a comprehensive security audit.

## 8 November 2026 — one real repair and scoped release

Runtime `952cae5f41a5a425310ab3ff6d320e1c5ecb1b61` adds a private receipt scope enforced in preview and at the provider boundary. Ten new simulated tests reject malformed scopes, other IDs/channels, scheduled posts, rescheduling, image replacement, moving to draft and correction creation before a request. The positive case verifies explicit Facebook post type and retained draft status. All existing test files and worker/cutoff/lease semantics were unchanged.

The normal Node 22 test command passed **96 tests in eight files**, with typecheck and production build. A fresh clone outside the repository passed `npm ci`, typecheck, the same default 96-test command and production build. Initial cold runs hit 5-second SQL timeouts; an unchanged warmed clean-clone run passed all 96 in 34.48 seconds. An earlier extended-budget run also accidentally discovered the task-owned nested verification clone; that clone was moved outside the project, preserving its files. No assertion or timeout in the repository's tests was weakened to obtain the default pass.

The owner explicitly authorized one fictional, unpublished Page draft. Controlled creation and smoke editing initially received `InvalidInputError` for missing Facebook type; the rejected attempts were retained. Corrected requests created one draft and changed Mill Studio → River Studio. Fresh readback verified draft status and unchanged non-caption fields. These are real provider tests, separate from the app repair.

Native in-app-browser testing at the deployed HTTPS URL imported that draft, set fictional source facts to November 21 / 18:00 / River Studio, confirmed its exact venue phrase and proposed only Garden Studio. The new scoped notice rendered. Before the receipt was installed the repair was withheld; after deployment, Refresh review made exactly one operation eligible. Apply produced one **Updated and verified** result with one attempt, zero skipped and zero needing attention. Buffer's own UI independently showed Garden Studio under Unscheduled / No time / Draft, with Queue 0, Drafts 1 and Sent 0. Screenshots are in `docs/images/live-draft-caption-preview.jpg`, `live-draft-result.jpg` and `buffer-draft-readback.jpg`.

Only the app container was restarted at 08:35 UTC. The operation record and encrypted connection were retained; fresh provider readback and the connected browser's result reload passed. [Credential-free evidence](../outputs/live-draft-repair-evidence.json) and [saved repair report](../outputs/live-draft-repair-report.md) distinguish fresh provider observations from recorded application state. No post was published, scheduled or deleted, and no Meta permission changed. The scope still excludes every other post/channel, scheduling, images and correction creation. Backup restoration and other live recovery/format paths remain untested.

Final staged credential scan: zero known-pattern findings; three JPEGs were omitted by the pattern scanner and visually reviewed. Exact configured credential bytes were absent from all tracked files, including image files, and reachable historical blobs. This is a bounded disclosure check, not a complete security audit.

## 8 November 2026 — public judge guide and recovery follow-through

Runtime `33ce5c21265c9fc0ce201794eb89f93f3a968e0b` is healthy at the same public URL. The app-only release preserved live operation and encrypted-connection counts, the restricted scope and its read-only mount. The new public guide and app-footer link work while logged out. Guide checks at 1440px and 375px showed no horizontal overflow; reduced motion was active, the 3px skip-link outline was visible, and Enter focused main. Fresh viewport captures are in `images/judge-guide-desktop.png` and `images/judge-guide-mobile.png`. All six source/proof links returned HTTP 200 without authentication.

The guide's complete hosted fictional sample passed: six phrase confirmations; only venue changed to River Studio; generated poster visually inspected before approval; a simulated third-post outside edit withheld; Enter applied one fictional repair with two skips; report download and result reload passed. At 375px there was no overflow or application alert, and Settings closed with Escape. No additional live provider write was performed. The 96-test default suite, typecheck and production build passed before release; the deployed Linux image built successfully. [Readiness receipt](../outputs/judge-readiness-evidence.json).

An isolated same-host PostgreSQL restoration passed for all nine table counts/content digests and schema/constraints/indexes. The saved verified real operation was present, and the restored encrypted connection decrypted with the original key. No app/worker ran against the copy; its network was disabled and no port was exposed. Temporary resources were removed; production was not restored over and no provider calls occurred. The retained backup shares the VM failure domain, so off-host disaster recovery remains untested. [Restoration receipt](../outputs/backup-restore-evidence.json).

The existing account's official submit page confirmed registration is incomplete. Dynamic submission fields remain inaccessible until registration; video recording/upload and final submission were not performed. User testing was skipped for this submission at the owner's request. No user findings, demand or measured savings are claimed. Earlier no-restore statements above describe their earlier checkpoints.

The final staged known-pattern scan found zero findings and omitted the two new PNGs as binary. Both screenshots were visually inspected. Exact configured credential bytes were absent from all 86 tracked files, reachable historical blobs and the public build. This is a bounded disclosure check, not a complete security audit.

## 8 November 2026 — live demo, public playback and submission preparation

The same authorized real draft was repaired Garden Studio → River Studio through the deployed app with one application attempt. Buffer's independent UI and fresh server readback matched the unpublished/unscheduled caption, with no unrelated provider-field change. The original and new application repairs total two on this fixture; no new fixture or broader scope was introduced. The new result survived the app-only video release, connected-browser reload and fresh provider read. [Operation proof](../outputs/recording-repair-evidence.json) · [Post-release proof](../outputs/recording-repair-post-release-evidence.json).

The completed demo is 114 seconds, captioned and silent, H.264 at 1920×1440/60 fps. It is assembled from actual browser captures with disclosed timing and cursor overlays. All frames decoded without errors. Hosted full-download SHA-256 matched the local artifact; the content type is video/mp4 and byte-range requests return 206. The HTML player loaded duration 114, reached 50 seconds without error, and responded to Space for play/pause. At mobile width 375, content width was 375. The viewport override was reset. TypeScript/production build passed, and the Node 22 default single-worker suite passed all 96 tests in eight files (4.97 seconds). [Video receipt](../outputs/demo-video-evidence.json).

The owner completed registration. The official form is filled through its final terms declaration, with legal identity and client ID kept out of public evidence. No terms acceptance or final submission has been performed. Earlier registration-gated and no-recording observations above remain dated checkpoints. User testing remains skipped by owner request.

# Build-window provenance

## 25 October 2026 — pre-window

PRD preservation; project design; local TypeScript/React/Express application; PostgreSQL/PGlite persistence; deterministic associations/time logic; Buffer OAuth/GraphQL adapter; operation worker; sample workflow; tests and documentation. This is pre-window work and must not be presented as new eligible-window functionality.

Official terms checked: https://buffer.com/api/commit/terms (updated October 13, 2026). Build and submission window starts October 28, 2026 at 12:01 a.m. Pacific and closes November 13 at 11:59 p.m. Pacific (November 14 at 1:29 p.m. IST). Existing projects are permitted only with new eligible-window elements identified. Recheck before submission.

## Eligible-window changes

### 8 November 2026 — repair handoff and first-use guidance

New functionality: a session-owned downloadable Markdown repair report from Review and Results. It separates unapplied proposals from recorded operation outcomes, includes caption/publication comparisons, warns that skipped posts remain scheduled, and directs uncertain outcomes to observation before retry. Literal fenced content prevents captions from injecting report Markdown. Credentials, internal account/operation IDs and media URLs are not included as report fields. Campaign captions remain user content and must be reviewed before sharing.

First-use improvements: stage-specific sample guidance, explicit simulated-apply labeling, a repeat-change example, connection details instead of OAuth links on unconfigured installations, and an early warning when a live installation has no verified write formats. These are changes to the existing October implementation, not a new claim about the original mechanism.

Evidence: four report behavior tests and an HTTP/SQL download/isolation/no-mutation test, bringing the suite to 84 tests. Browser observations, current rule mapping and remaining release gates are recorded in [judge-walkthrough.md](judge-walkthrough.md). No live writes, deployment or submission are part of these additions. The initial GitHub import is `776db34`; the November 8 changes are the diff after that baseline. Only the new elements are candidates for build-window judging; Buffer decides eligibility and scoring.

## 25 October follow-up: approved temporary HTTPS and first live OAuth

Created the scoped private Buffer client and an isolated production-mode test instance through a free temporary Cloudflare Quick Tunnel. The user approved both client creation/public exposure and the subsequent account-access grant. A direct UI copy/paste stored the secret locally without exposing it in conversation. OAuth and three live read queries succeeded; one organization, zero channels. Encrypted connection persistence survived restart. No live write, paid resource, commit/push, public progress post or submission occurred. This remains pre-window work; see outputs/LIVE-SETUP.md and redacted live-setup-evidence.json.

## 25 October follow-up: restricted Page connection and read-only post test

The user signed in to Meta and approved only the Himanshu jha Page with public-profile, Page-listing and Page-content read permissions. Buffer connected the Page; optional write/ads/business/Instagram permissions were disabled. Changeboard discovered the Page and read an empty draft/scheduled/sent post page (limit 20, no next cursor), matching Buffer UI counts. Six total provider read receipts and zero post-write receipts are retained. A stale channel-cache bug was reproduced with a local HTTP/SQL regression, fixed, and verified by 79 passing tests plus TypeScript/production build. The empty live workspace persisted after restart. Nonempty data, pagination and mutations remain unverified; no fixtures were created under the read-only authorization. This remains pre-window work.

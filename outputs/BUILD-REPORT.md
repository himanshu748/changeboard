# Changeboard — build handoff

**Local MVP verified; first live Buffer OAuth/account/channel reads verified. The owned Page is connected and bounded empty post import passed. Nonempty data and live repair evidence remain open.**

Open the running app: [http://127.0.0.1:4310](http://127.0.0.1:4310).

The app implements the four-screen workflow, persistent exact-span fact associations, a second event change, complete caption comparisons, timezone-aware scheduling choices, revision-specific image reviews and a deterministic poster, immutable approval records, durable per-post execution/recovery, external-edit withholding and separate correction drafts. The fictional sample is clearly separated from live accounts. Buffer OAuth/GraphQL adapters are implemented but live formats remain disabled until verified.

## What passed

- **79 tests in five suites**: deterministic domain, simulated Buffer adapters, connection isolation/refresh with SQL, local HTTP/server integration, and worker recovery.
- Strict TypeScript and production build.
- Formatting check; npm reported zero known dependency vulnerabilities at installation.
- Real browser walkthrough at **1440px and 375px**, with no mobile horizontal overflow, reduced-motion checks, visible keyboard focus, Enter/Tab/Escape operation, separate sample correction creation, persisted partial results, repeat venue repair and persistence after a server restart.
- Saved original PRD matches the supplied file. Local configuration/secret values are excluded from the source bundle.

These checks do not prove live Buffer behavior, public hosting, production reliability or customer demand.

## Live setup and remaining external steps

**The scoped Buffer client is created and the first live OAuth connection succeeded.** The temporary HTTPS app is [https://knights-converter-shorts-prints.trycloudflare.com](https://knights-converter-shorts-prints.trycloudflare.com); see `LIVE-SETUP.md` for its lifetime, configuration and restart instructions.

Client credentials are saved only in the ignored mode-0600 `.env.integration`. The private client permits account-read, post-read and post-write; the approved OAuth grant includes refresh access. Six live account/channel/post read queries returned HTTP 200. One organization and the owned **Himanshu jha** Facebook Page were returned. The Page uses a restricted Meta read grant. Its 20-post bounded import returned zero posts with no next page, matching Buffer’s Queue/Drafts/Sent counts of zero. Encrypted tokens and selected-organization state survived a server restart. No live write call or queued operation occurred; format gates remain disabled.

The user completed Meta sign-in and explicitly selected/authorized the Himanshu jha Page. Optional publishing, ads, business, Instagram, email, insights and Page management permissions were disabled. No posts were created or edited. A refresh-cache bug was reproduced with an HTTP/SQL test, fixed, and verified by the 79-test suite/build and live channel discovery. Nonempty post comparison and pagination need existing Buffer posts; live edit/draft fixtures require separate approval. A second ordinary account, live refresh/revocation, public-media acceptance, durable hosting with PostgreSQL/backups, working provider video and three-user validation remain open.

The temporary HTTPS tunnel was explicitly authorized. It is not durable production hosting and stops when its process or this computer is unavailable. No paid resource, upgrade, Git commit/push, public progress post, registration or contest submission was performed. Gmail was not accessed; the email-verification gate had already cleared.

## Deliverables

- `changeboard-source.zip`: application, lockfile, tests, migrations, PRD/design/checklist and documentation.
- `verification-evidence.json`: compact machine-readable verification record.
- `LIVE-SETUP.md`, `live-setup-evidence.json`, and `read-only-test-evidence.json`: temporary HTTPS runtime, Page grant and redacted live read receipts.
- `screenshots/`: desktop, mobile, conflict, result and repeat-change evidence.
- `demo-script.md`: 116-second sample rehearsal and explicit gates for a live recording.
- `submission-overview.md`: approximately 300-word draft with accurate status.
- `progress-draft.md`: unpublished progress copy.

The source bundle’s README documents `npm ci`, `npm run dev`, `npm test -- --maxWorkers=1`, and `npm run build`. Production PostgreSQL is selected with `DATABASE_URL`; local PGlite persists in `work/data`. One process may own a PGlite data directory.

All current implementation is recorded as **25 October pre-window work**. Eligible-window functionality must be identified separately. A live working demo video and three-user validation have not been completed.

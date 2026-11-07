# Changeboard

Change one event fact. Repair the campaign.

A TypeScript application for connecting event facts to precise phrases in existing Buffer posts, reviewing repairs and tracking each approved operation. The working local sample uses fictional Clay After Hours posts and a separate persisted simulated remote store. **The first live OAuth connection and account/channel reads now pass through an authorized temporary HTTPS tunnel.** The owned Facebook Page is connected with restricted read access, and its bounded post import passed with an empty result. Nonempty content/pagination, live mutations, a second account, durable hosting, and user validation remain acceptance gates. No contest submission has been performed. See `outputs/LIVE-SETUP.md`.

## Run locally

Node 22.14+ is supported. Install and run:

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:4310. No account, secret, AI key or paid service is needed for the sample. PGlite (the PostgreSQL engine compiled to WebAssembly) persists development records in `work/data`. Run only one server per PGlite directory. It can take longer on a cold start. Restarting the application preserves campaigns and operation outcomes. `work/` is ignored and must never be published.

```sh
npm run typecheck
npm test -- --maxWorkers=1
npm run build
npm run db:migrate
```

Run database tests sequentially on memory-constrained hosts. The test suites distinguish deterministic logic, simulated Buffer responses, and local HTTP/SQL integration. None are live Buffer proof. The pinned install is recorded in package-lock.json.

## The useful journey

1. Try the sample; select the three existing posts and optionally the published announcement.
2. Confirm the original event facts, then each exact phrase. Manual association controls support occurrence selection.
3. Use the example event change or enter new date/time/venue/address facts.
4. Review complete caption comparisons. Confirm fixed publication context or choose a different schedule strategy. Review every image for this revision; preview the generated poster before accepting it.
5. Simulate a direct edit to a sample post. Refresh the preview to see it withheld. Select eligible operations and apply their immutable server change set.
6. Results preserve successful, skipped, failed, conflicting and uncertain operations. A skipped scheduled post keeps its schedule. A correction is a separately reviewed new draft.
7. Make another event change. Verified snapshots and exact association offsets are reused; unresolved posts retain their earlier baseline.

Sample mode never calls Buffer. The simulated external-edit control changes an independently stored source, so the same source-fingerprint check detects the conflict. AI extraction and OCR are unavailable; deterministic suggestions and manual confirmation are the implemented fallback. No unreviewed image is declared accurate.

## Buffer configuration

Copy `.env.example` to `.env` and configure `BUFFER_CLIENT_ID`, `BUFFER_CLIENT_SECRET` for a server/private client, `BUFFER_REDIRECT_URI`, and a random 32-byte base64 `TOKEN_ENCRYPTION_KEY`. Never send secrets in chat or browser storage. Buffer requires an exact registered **HTTPS** callback, including localhost. The callback path is `/api/auth/callback`.

The authorization flow requests `account:read posts:read posts:write offline_access`. Tokens stay server-side, encrypted with AES-256-GCM and owner-bound authenticated data. Refresh is serialized by a database row lock and saves both rotated tokens atomically. An ambiguous refresh requires reconnect. Ordinary OAuth users choose an accessible organization explicitly. All campaigns, operations and uploads are checked against their local owner; imported IDs alone confer no access.

The app records bounded, credential-free API receipts privately inside each connection record, with app-wide Retry-After cooldown. Live formats default to disabled. After authorized tests on owned channels, supply `LIVE_FORMAT_EVIDENCE_FILE` with entries of this shape:

```json
[{"key":"facebook:page:text","verifiedAt":"<actual ISO timestamp>","receiptId":"<actual receipt reference>"}]
```

Do not populate this file from simulated results. See `docs/api-verification.md` and `docs/live-validation.md`. Live Instagram correction drafts are withheld until a separately reviewed correction image is implemented and tested; the text-only correction path supports verified Facebook Page channels.

## Architecture and invariants

One React frontend and Express API, PostgreSQL-compatible durable records, and a small database-backed worker. The worker runs in the server process and claims individual rows with leases. Production supports PostgreSQL via `DATABASE_URL`; no Redis, graph store or agent framework is needed.

- `src/domain`: validated facts, UTF-16 exact spans, deterministic text repair, Temporal calendar arithmetic, eligibility.
- `src/buffer`: current typed GraphQL adapter, narrow edit payloads, OAuth and token encryption.
- `src/server`: sessions/CSRF, account ownership, immutable change sets, persistence, retained media, queue and reconciliation.
- `src/client`: introduction and four workflow screens.
- `migrations/001_initial.sql`: initial durable schema. Campaign JSON preserves snapshots/bindings; immutable fact revisions and change sets have separate rows; operations are independently durable.

Before a write the worker re-fetches the remote post, compares relevant content/media/schedule/metadata and checks status, permissions and the ten-minute cutoff. Each selected operation is persisted before calling Buffer, then read back. Crashed leases become uncertain, never automatically pending. Lost create responses are not blindly retried. Remote simultaneous-edit races still exist: Buffer does not provide an atomic multi-post transaction or a remote exactly-once guarantee. A read before a write cannot eliminate a race in between.

Assets are PNGs at stable opaque `/media/:id` URLs served from the durable database. The small MVP deliberately uses same-origin immutable media instead of introducing a separate object-storage dependency. Live media requires a public HTTPS origin and remains retained before a potentially successful mutation, including uncertain outcomes. Public asset URLs have no login requirement because Buffer must fetch them. Only publish-intended images should be uploaded.

## Release and data behavior

See `docs/deployment.md`, `docs/privacy.md`, `CHECKLIST.md`, and `docs/verification.md`. The project-specific UI decisions are in `design.md`; the unchanged supplied specification is `PRD.md`.

All functionality in this workspace was prepared before the Buffer Commit build window. Track eligible-window additions separately in `docs/build-log.md`. The prepared demo script and overview under `outputs/` are drafts, not a submitted entry or a claim of live integration success.

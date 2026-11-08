# Deployment and recovery

Verified 8 November 2026. **[Public app](https://changeboard.52.202.25.181.sslip.io)** · **[Privacy](https://changeboard.52.202.25.181.sslip.io/privacy)**. Current runtime source: `956439aef48ad1f31df2b3cd8db60958c3bbaa01`; [live repair and restart evidence](../outputs/live-draft-repair-evidence.json). The earlier [deployment snapshot](../outputs/deployment-evidence.json) is retained with its original timestamp.

## Actual deployment

The app reuses existing, user-authorized AWS Lightsail capacity and its static IP. No instance, database service, paid domain or other billable cloud resource was created or resized. The existing VM bill continues. The proposed Render path was blocked by that workspace's resource quota; no Render service was created.

The VM stays running rather than sleeping after inactivity. Application restarts briefly interrupt requests; shared-host CPU, memory and disk pressure can slow startup or requests. This is one VM, not a highly available service. Availability through judging requires keeping that VM, static IP, proxy and database running; a deployment receipt does not guarantee future uptime. The hostname also depends on sslip.io DNS and automated certificate renewal.

`deploy/compose.yaml` runs one nonroot Node application and PostgreSQL on separate named networks. `changeboard-app` is limited to 384 MiB and 0.5 CPU; `changeboard-db` to 128 MiB and 0.25 CPU. PostgreSQL's database network is internal and has no published port. The existing Caddy proxy joins only the frontend network and forwards this hostname to `changeboard-app:4310`; other sites retain their existing routes. Do not replace the shared proxy configuration or restart unrelated containers.

The checked runtime is Node v22.23.4 and PostgreSQL 17.11. PostgreSQL uses the persistent `changeboard_postgres-data` volume. Campaigns, encrypted connections, operations and public PNG assets are database records. Production refuses to start without `DATABASE_URL`, an HTTPS `APP_ORIGIN` and a 32-byte base64 `TOKEN_ENCRYPTION_KEY`; it does not fall back to PGlite.

## Configuration and release

Source is at `/opt/changeboard/source`. Root-owned mode-0600 `/opt/changeboard/.env.production`, outside the checkout, supplies `POSTGRES_PASSWORD`, `TOKEN_ENCRYPTION_KEY`, `BUFFER_CLIENT_ID`, `BUFFER_CLIENT_SECRET`, `APP_ORIGIN`, `BUFFER_REDIRECT_URI` and `CHANGEBOARD_IMAGE`. Compose constructs `DATABASE_URL`. Never print resolved Compose configuration, container environment, token records or that file into logs or receipts.

Keep the same encryption key and database password across releases. The exact existing Buffer app settings must be:

- App origin: `https://changeboard.52.202.25.181.sslip.io`
- Callback: `https://changeboard.52.202.25.181.sslip.io/api/auth/callback`
- Privacy: `https://changeboard.52.202.25.181.sslip.io/privacy`

**The existing client callback and privacy URL were saved in Buffer on November 8.** Ordinary deployed OAuth, Page discovery and empty import passed; the encrypted connection and selected organization survived an app restart at 07:26 UTC, followed by fresh account/channel reads. See [the credential-free receipt](../outputs/deployed-oauth-evidence.json). Setting an environment variable alone would not establish this provider-side update. Do not create another app or expand OAuth/Meta permissions. The later authorized one-draft test mounts the restricted evidence below; other live writes remain disabled.

For a reviewed release, validate a clean checkout, take a private database backup before migrations, build an image tagged with its exact commit, then update only `CHANGEBOARD_IMAGE` in the private environment file. Example operator commands on the VM, from the reviewed source checkout:

```sh
docker build --build-arg SOURCE_REVISION=<reviewed-commit> -t changeboard:<reviewed-commit> .
docker compose --env-file /opt/changeboard/.env.production -f deploy/compose.yaml config --quiet
docker compose --env-file /opt/changeboard/.env.production -f deploy/compose.yaml up -d app
```

The app runs additive migrations on startup. Do not run an unbounded image build on this shared host: the actual build used a 512 MiB memory / 768 MiB swap / one-CPU ceiling. Check available resources and preserve existing services. The initial Compose configuration, Linux build, application health and unchanged states of other containers were checked; this is not a load or penetration test.

## Verification and recovery

Check HTTPS `/health`, `/privacy` and `/` without disabling certificate verification. Complete the logged-out sample, view its actual PNG, and reload its result. The November 8 check recorded one verified fictional update and two skips before and after restarting only `changeboard-app`. This proves hosted sample persistence, not Buffer OAuth persistence or a live repair. The separate OAuth restart check passed at 07:26 UTC: one unchanged encrypted connection, retained organization, connected browser reload and fresh HTTP 200 account/channel reads. No post-write receipt was recorded.

A safe private database dump can be created under an operator-approved backup directory with restrictive permissions:

```sh
umask 077
docker exec changeboard-db pg_dump -U changeboard -d changeboard -Fc > <private-backup-path>
```

The dump contains sensitive campaign and encrypted connection data. Protect a matching encryption key separately. An isolated same-host PostgreSQL restoration passed on November 8; see [the receipt](../outputs/backup-restore-evidence.json). Off-host disaster recovery has not been tested. For rollback, restore a compatible image/database pair; do not remove the database volume or run `docker compose down -v`. Rotating the encryption key requires controlled re-encryption or reconnection. Keep public media reachable while any potentially successful Buffer mutation depends on it.

A worker crash leaves a running operation until its 120-second lease expires; it then becomes uncertain and needs observation, never automatic replay. Stopping Changeboard does not stop Buffer publication. Remote edits have no guaranteed rollback or multi-post transaction.

Limits remain six selected posts; 20-post pages / at most 100 candidates; 5 MB uploaded images and 25 million decoded pixels; controlled English date expressions. Abuse quotas, external monitoring, multi-process deployment and off-host disaster recovery need further validation. No full security audit or uptime guarantee is claimed.

## Restricted draft-validation release

Runtime `952cae5` was deployed at 08:28 UTC on November 8. Only the application container was recreated; other container states were unchanged. A private pre-release PostgreSQL dump was taken. A later consistent-snapshot backup was restored and checked in isolation; the current receipt distinguishes that same-host check from failover. The encryption key and database credentials were preserved.

The current release uses the optional `deploy/live-validation.compose.yaml` overlay. `CHANGEBOARD_LIVE_EVIDENCE_PATH` points to `/opt/changeboard/live-validation/enabled-evidence.json`, outside the checkout. That genuine smoke-test receipt restricts writes to caption edits on one unpublished fixture and its existing channel. The containing host directory is private; the credential-free scope file is readable inside its read-only bind mount by the nonroot app. Never replace it with a simulated receipt or expand its IDs without authorization and actual validation.

When retaining this scope in a reviewed upgrade, include both Compose files:

```sh
docker compose --env-file /opt/changeboard/.env.production -f deploy/compose.yaml -f deploy/live-validation.compose.yaml config --quiet
docker compose --env-file /opt/changeboard/.env.production -f deploy/compose.yaml -f deploy/live-validation.compose.yaml up -d --no-deps app
```

Omitting the overlay disables these live writes. The overlay refuses to create a missing host path. Do not use resolved `compose config` output in logs: it contains credentials. Health alone does not prove an authorized write; check the in-app scope notice and verified receipt.

The real River Studio → Garden Studio repair succeeded with one application attempt. At 08:35 UTC, another application restart preserved the live operation and encrypted connection; fresh provider readback and browser reload passed. Nothing was scheduled, published or deleted. Scheduling, images, other drafts and correction creation remain outside this test's scope.

## Verified isolated restoration

On November 8, a read-only repeatable-read snapshot supplied a consistent `pg_dump --format=custom --snapshot=...` backup. The snapshot transaction was closed after the dump. A temporary PostgreSQL 17 container restored it with `pg_restore --no-owner --no-privileges --single-transaction --exit-on-error`. Its network mode was `none`, no port was published, and its memory/CPU were bounded. No application or worker was started against that copy.

All nine table row counts and canonical content digests matched the source snapshot. Columns, constraints and indexes also matched. The verified live repair record was present, and the restored encrypted connection decrypted using the preserved original key without contacting Buffer. The temporary container/data and its disposable password file were removed; production services were left running and their container states were unchanged. The private backup remains outside the checkout on the VM. [Credential-free evidence](../outputs/backup-restore-evidence.json).

This proves same-host logical backup restoration. The backup and live database still share the VM failure domain; no off-host restore or regional failover is claimed. Preserve the matching encryption key separately and keep backups private.

## Public judge guide release

Runtime `33ce5c21265c9fc0ce201794eb89f93f3a968e0b` became healthy at 11:46:53 UTC on November 8. The image adds the static `/judge.html` guide and an app-footer entry point. Only the app was recreated. The database, encrypted connection, verified live-operation counts, evidence scope and read-only receipt mount were preserved; other container states were unchanged. No additional provider write was performed. [Judge-readiness evidence](../outputs/judge-readiness-evidence.json).

## Live-demo release

Runtime `956439aef48ad1f31df2b3cd8db60958c3bbaa01` became healthy at 12:23:09 UTC on November 8. It serves `/demo.html`, `/demo.mp4`, a poster and transcript from the existing app image. The MP4 is about 4.8 MB; HTTPS full download and byte-range requests passed, and public bytes match the local SHA-256. There is no third-party video host, new cloud resource or additional paid tier. The watch page is account-free; its HTML player supports native controls and fullscreen.

Only the app was recreated. Both verified real caption operations, one encrypted connection, the original credentials and scope, and the read-only evidence mount were retained; other container states were unchanged. The connected browser reloaded the second result, and fresh post-release Buffer readback still showed River Studio as an unscheduled draft with unchanged unrelated fields. No new provider write occurred during deployment. [Video/deployment evidence](../outputs/demo-video-evidence.json) · [Post-release readback](../outputs/recording-repair-post-release-evidence.json).

# Deployment and recovery

Verified 8 November 2026. **[Public app](https://changeboard.52.202.25.181.sslip.io)** · **[Privacy](https://changeboard.52.202.25.181.sslip.io/privacy)**. Runtime source: `5151595d1eefe7882f6b186d6812fa00969eabf0`; [dated evidence](../outputs/deployment-evidence.json).

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

**The existing client callback and privacy URL were saved in Buffer on November 8.** Ordinary deployed OAuth, Page discovery and empty import passed; the encrypted connection and selected organization survived an app restart at 07:26 UTC, followed by fresh account/channel reads. See [the credential-free receipt](../outputs/deployed-oauth-evidence.json). Setting an environment variable alone would not establish this provider-side update. Do not create another app or expand OAuth/Meta permissions. Live write formats remain disabled; `LIVE_FORMAT_EVIDENCE_FILE` is unset.

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

The dump contains sensitive campaign and encrypted connection data. Protect a matching encryption key separately. Backup restoration has **not** been rehearsed. For rollback, restore a compatible image/database pair; do not remove the database volume or run `docker compose down -v`. Rotating the encryption key requires controlled re-encryption or reconnection. Keep public media reachable while any potentially successful Buffer mutation depends on it.

A worker crash leaves a running operation until its 120-second lease expires; it then becomes uncertain and needs observation, never automatic replay. Stopping Changeboard does not stop Buffer publication. Remote edits have no guaranteed rollback or multi-post transaction.

Limits remain six selected posts; 20-post pages / at most 100 candidates; 5 MB uploaded images and 25 million decoded pixels; controlled English date expressions. Abuse quotas, external monitoring, multi-process deployment and operational backup/restore need further validation. No full security audit or uptime guarantee is claimed.

# Deployment runbook — temporary test endpoint only

Use a long-running Node 22.14+ process, PostgreSQL and a public HTTPS hostname. Do not use an ephemeral filesystem for PGlite or run several processes against the same PGlite directory. Production deployment should use `DATABASE_URL` and PostgreSQL backups. The in-process worker requires the server to remain running; a static frontend host alone is insufficient.

1. Choose a host and authorize deployment. An explicitly authorized temporary Cloudflare Quick Tunnel is running for integration testing; see `outputs/LIVE-SETUP.md`. No paid resource or durable hosted release has been provisioned.
2. Configure `DATABASE_URL`, `APP_ORIGIN` (HTTPS), `HOST`, `PORT`, Buffer client settings and `TOKEN_ENCRYPTION_KEY` in the host's secret store. Preserve the encryption key across releases; rotating it requires controlled re-encryption or reconnection.
3. Run `npm ci`, `npm run db:migrate`, `npm run build`, then `npm start` behind the host's TLS proxy. The health endpoint is `/health`. Use one worker initially; PostgreSQL row claims permit additional processes, but that deployment has not been load tested.
4. Register exactly `${APP_ORIGIN}/api/auth/callback` in Buffer. OAuth redirect uses that exact HTTPS string. Use the implemented public `/privacy` route as the privacy URL, after reviewing its policy for the chosen deployment.
5. Confirm cookies are Secure/HttpOnly/SameSite=Lax, origin/CSRF checks pass through the proxy, generated `/media/` URLs are public and stable, and expired tokens reconnect.
6. Complete the live-validation gates with disposable fictional posts on owned test channels. Do not alter a customer's scheduled campaign to bootstrap verification.
7. Only then record real format receipts and enable those exact format keys. Keep unverified formats withheld.
8. Keep the service and retained media reachable through judging; monitor health, database capacity, uncertain jobs, OAuth errors and rate-limit cooldowns.

Recovery: take a database backup before schema changes. This initial migration is additive. Restore a matching application/database pair for rollback; never replay uncertain jobs. A worker crash leaves a running operation until its 120-second lease expires, after which it becomes uncertain and requires observation. A stopped app does not stop Buffer publication. No guaranteed rollback of remote edits is claimed.

Limits: max six selected posts; bounded reads of 20 posts per page, max 100 candidates; 5 MB uploaded image input, 25 million decoded pixels; English controlled date expressions. Future production work includes resource/abuse quotas, monitoring integration and a verified operational backup/restore rehearsal. Hosted PostgreSQL and public media behavior have not been tested in this local build.

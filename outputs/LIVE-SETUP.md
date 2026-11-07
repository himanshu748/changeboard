# Changeboard live connection — 25 October 2026

[Open the temporary HTTPS app](https://knights-converter-shorts-prints.trycloudflare.com) · [Privacy page](https://knights-converter-shorts-prints.trycloudflare.com/privacy)

The private Buffer OAuth client **Changeboard** is created. Its registered redirect is `https://knights-converter-shorts-prints.trycloudflare.com/api/auth/callback`. Only `account:read`, `posts:read`, and `posts:write` are enabled on the client. The user approved connecting the actual Buffer account; OAuth also granted `offline_access` for refresh.

## Observed live evidence

- Authorization-code/PKCE flow and confidential-client token exchange succeeded through the registered HTTPS callback.
- Six live GraphQL reads returned HTTP 200: account discovery three times, channel discovery twice, and a bounded posts read. One organization and the owned **Himanshu jha** Facebook Page were returned.
- The selected-Page post request (limit 20, draft/scheduled/sent) returned zero posts, no next page and no cursor. Buffer’s Queue, Drafts and Sent tabs also showed zero.
- Explicit organization refresh now bypasses stale discovery caches. A new HTTP/SQL regression failed before the fix; all 79 tests and the production build passed after it.
- Access and refresh tokens are encrypted in the separate integration database. Connection, selected organization, and channel results survived a clean server restart and browser reload.
- Secure/HttpOnly/SameSite=Lax cookies, no-store API responses, CSP, frame denial and nosniff were observed. Configuration, server source and Vite development paths did not expose source files.
- The compiled app rendered through HTTPS and opened its labeled fictional sample.
- **Zero live write calls and zero queued operations. Live write formats remain disabled.**

Redacted receipts are in `live-setup-evidence.json` and `read-only-test-evidence.json`. No credentials, account identifiers or token values are included there. Client credentials are stored in the ignored `.env.integration` with mode 0600. A direct UI copy/paste through a one-use loopback form saved the secret without displaying it in conversation; that receiver has closed. Gmail was not accessed.

## Runtime and limits

This is a temporary Cloudflare Quick Tunnel to a production-mode Node process at `127.0.0.1:4311`, with separate durable-on-this-machine PGlite data in `work/integration-data`. It is not a persistent hosted deployment. The original local sample remains at `http://127.0.0.1:4310`.

The tunnel URL works only while the tunnel process and this computer remain available. A new Quick Tunnel produces a different hostname; update `APP_ORIGIN`, `BUFFER_REDIRECT_URI`, `PUBLIC_MEDIA_ORIGIN` and both Buffer client URLs together before reconnecting. Existing generated-media URLs must remain reachable for any future scheduled post; do not use this temporary endpoint for important live content.

Restart the integration app from the source directory with:

```sh
node --env-file=.env.integration --import tsx src/server/index.ts
```

Do not run two processes against `work/integration-data`. Stop only the known integration process before restarting it. The credentials and database are deliberately excluded from the downloadable source bundle.

## Connected channel and permissions

The user completed Facebook sign-in and explicitly authorized **Himanshu jha**. Only that Page was selected. The Meta grant contains mandatory name/profile picture, selected-Page listing, and Page-content reads. Optional email, insights, ads, business management, Instagram, publishing, comments/user-content and Page-account/webhook management permissions were disabled before consent. Buffer accepted the connection with these restrictions. No password was extracted or displayed. The posting-goal wizard was dismissed; Buffer created its own default empty posting-time slots as part of channel setup. No post was scheduled or created.

## Remaining acceptance gates

The Page connection and empty import are verified. Existing nonempty Buffer posts are needed to compare real captions, assets, schedules and pagination. Nothing was created to fill the empty account because the authorized tests are read-only. Live edit/draft tests still require separately reviewed fictional future-dated fixtures and approval; no format gate was enabled by this connection test. A second ordinary account, refresh rotation/revocation behavior, public media acceptance by Buffer, durable hosting, live demo video and three-user validation remain unverified.

Cloudflare documents Quick Tunnels as temporary development/testing endpoints: [official guide](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/).

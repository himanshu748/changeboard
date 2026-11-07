# Internal application contract

All API routes return JSON. Errors `{error: string}`. GET /api/state returns AppState (src/shared.ts), establishes httpOnly session and CSRF token. Every POST/PATCH/DELETE sends x-csrf-token and same-origin credentials; CSRF is returned only to the owning same-origin session. Mutations return refreshed AppState unless noted. UI should consume returned state, never store tokens or account data in localStorage. All local IDs authorized server-side.

- POST /api/sample {} creates fictional sample, stage choose.
- POST /api/campaign/select {postIds:string[], announcementId?:string} selects max six, stage facts. Campaign is current session's resource.
- POST /api/campaign/facts {facts:Facts, confirmed:boolean, name?:string} confirms current source facts; recomputes suggestions (only before an approved change).
- POST /api/campaign/binding {postId,bindingId,confirmed:boolean,ignored?:boolean}; manual: {postId,fact,text,occurrence,kind?}.
- POST /api/campaign/propose {facts:Facts} new target revision, invalidates media and preview, stage review.
- POST /api/campaign/schedule {postId,schedule:ScheduleOptions} updates choices; recomputes server preview.
- POST /api/campaign/media {postId,status:'accurate'|'poster'|'replacement',acknowledged:boolean,url?:string,altText?:string} review current revision. Poster returns exact asset URL in media.url; generating is not acknowledgement. Replacement upload: POST /api/assets {data:string (base64 image bytes),mime:'image/png'|'image/jpeg'|'image/webp',altText:string}, response {url,altText}. Max 5MB.
- POST /api/campaign/preview {selectedPostIds?:string[]} regenerates immutable changeSet server-side. UI call on per-post selection change and consume returned set. Ineligible operations cannot be selected. Default eligible selection is explicit on displayed preview before final apply.
- POST /api/campaign/apply {changeSetId,revision} enqueues selected immutable operations and returns. Poll GET /api/state to show running results (500–1500ms while pending).
- POST /api/campaign/refresh {postId} fetches current source, invalidates/re-suggests bindings and approval, stage facts.
- POST /api/campaign/next {} retains validated snapshots/bindings, copies current facts to proposed, stage facts.
- POST /api/campaign/stage {stage:'choose'|'facts'|'review'|'results'} navigation only; server retains data.
- POST /api/campaign/reconcile {operationId} observes uncertain remote outcome without blind retry.
- POST /api/campaign/move-to-draft {postId,confirm:boolean} first false makes a reviewed preview, true still requires apply with resulting changeset ID. UI uses false then normal apply.
- POST /api/campaign/correction {text,channelId,approve:boolean} false saves review; true creates immutable correction op for worker. Original public post is untouched. UI explicit separate action.
- POST /api/sample/conflict {postId} changes the simulated remote snapshot; no external calls. Use to demonstrate a source conflict after import/preview.
- GET /api/auth/buffer initiates PKCE; GET /api/auth/callback handles callback, redirects /.
- POST /api/organization {organizationId} explicit selection/discovery.
- POST /api/import {channelId?,status?:'draft'|'scheduled'|'sent',after?:string,dateFrom?:string,dateTo?:string} bounded live read; response includes AppState plus nextCursor; append user-selected imported candidates. No live channel repair enabled without verification.
- POST /api/disconnect {} removes encrypted connection credentials; remote posts unchanged.
- DELETE /api/data removes session-owned campaign/auth records; remote posts unchanged. Referenced public assets retained until proven unreferenced.

No browser-supplied mutation payload is sent directly to Buffer. Preview selections, facts and snapshots are saved/versioned before approval; any change invalidates the prior change set.

Explicit `POST /api/organization` selection refreshes remote account/channel discovery even within the normal five-minute client cache. This lets a newly connected Page appear immediately without restarting the service.

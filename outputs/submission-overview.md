# Changeboard

Public app: https://changeboard.52.202.25.181.sslip.io

An event time changes, and twelve scheduled posts are suddenly wrong. A small venue or workshop organizer must find references scattered across differently worded captions, reminders and graphics while preserving the writing that already works. One missed announcement can keep directing people to the old plan.

Changeboard connects event facts to the campaign already written. An organizer selects up to six existing posts per review, confirms the original facts and reviews exact caption phrases. Changing a date, time, venue or address produces complete before-and-after captions. Confirmed associations are retained for later changes, so the organizer can review precise repairs rather than rewrite each announcement.

The public app runs on stable HTTPS with PostgreSQL. Its Buffer integration uses ordinary OAuth with PKCE, encrypted server-side credentials, organization/channel discovery and bounded post reads. An initial live checkpoint verified an owned Facebook Page and an empty import through six successful read receipts.

On November 8, an explicitly authorized live test created one fictional, unpublished text draft. After a separate provider smoke test, the deployed app imported that draft, confirmed its venue phrase and repaired River Studio to Garden Studio. The worker re-fetched the source before editing and verified the result afterward. Buffer’s own interface independently showed the new caption as an unscheduled draft, with zero queued and zero sent posts. The durable result and encrypted connection survived an application restart; fresh provider readback still matched.

That proof enables only caption edits on the exact validated draft and channel. Other drafts, scheduled posts, images and correction-draft creation remain blocked by its scope. No post was published, scheduled or deleted, and no Meta permission was expanded.

The separate fictional sample demonstrates reviewed image replacement, a simulated outside edit, one simulated update and two skipped posts. Sample operations never call Buffer. Its report keeps unresolved work and unchanged schedules visible.

November additions include repair-report downloads, guided first use, durable deployment, visible read receipts, scoped write evidence and the Facebook draft payload repair. The October implementation remains identified as pre-window work. Next steps are organizer walkthroughs, backup restoration and separately authorized validation of broader formats. No measured time savings or customer demand are claimed.

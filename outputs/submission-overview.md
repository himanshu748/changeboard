# Changeboard

Public app: https://changeboard.52.202.25.181.sslip.io

An event time changes, and twelve scheduled posts are suddenly wrong. A small venue or workshop organizer must find references scattered across differently worded captions, reminders and graphics while preserving the writing that already works. One missed announcement can keep directing people to the old plan.

Changeboard connects event facts to the campaign already written. An organizer selects up to six existing posts, confirms the original details and reviews exact caption phrases. Changing a date, time, venue or address produces complete before-and-after captions. Confirmed associations are retained for later changes. Every selected update receives its own outcome, and a downloadable report keeps unresolved work visible for a handoff.

The Buffer integration uses ordinary OAuth with PKCE, encrypted server-side credentials, GraphQL organization/channel discovery, bounded post reads and a scoped caption-edit mutation. The worker re-fetches each source before editing and reads it back afterward.

The live demo reuses a confirmed venue phrase on one explicitly authorized unpublished Facebook draft, repairing Garden Studio to River Studio. Buffer independently shows the updated caption as Unscheduled / Draft, with zero queued and sent posts. The content is fictional; the API calls are real. An earlier repair and encrypted connection survived an application restart. Live writes remain restricted to this exact draft and channel; scheduling, images and correction creation are not enabled by that proof.

A separate account-free sample demonstrates reviewed image replacement, a simulated outside edit and partial results. It never calls Buffer. The public app runs on HTTPS with PostgreSQL, and an isolated same-host backup restoration passed.

November additions include report downloads, guided first use, durable hosting, visible read receipts, scoped write evidence and the Facebook draft payload repair. October work stays identified as pre-window. Next steps are off-host recovery and separately authorized broader-format validation. User testing was skipped for this submission; no measured savings or customer demand are claimed.

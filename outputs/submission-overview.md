# Changeboard

Public app: https://changeboard.52.202.25.181.sslip.io

An event time changes, and twelve scheduled posts are suddenly wrong. For a small venue or workshop organizer, finding every reference means checking differently worded captions, reminders and graphics while trying to preserve the writing that already works. One missed announcement can keep sending people to the old plan.

Changeboard helps repair that campaign. An organizer selects up to six existing posts per review, confirms the original event facts and connects them to exact caption phrases. Changing a date, time, venue or address produces complete before-and-after captions. Confirmed associations can be reused for the next change, so the organizer reviews precise repairs rather than rewriting every announcement.

Images and publication context receive separate attention. A caption edit does not make an old flyer accurate. Organizers inspect a replacement poster before acknowledging it for that revision. Relative reminders require a confirmed publication time. Posts with changed source content are withheld from the approved set. Individual results keep skipped and uncertain work visible, including the warning that skipping a scheduled post does not stop publication.

The deployed Buffer integration uses ordinary OAuth with PKCE, encrypted server-side tokens, organization/channel discovery and bounded post reads. On November 8, six real read receipts returned HTTP 200 without API errors, including discovery of the existing owned Facebook Page and an empty post import. The encrypted connection and selected organization survived an application restart; fresh reads succeeded afterward. These checks ran at the stable public HTTPS URL with PostgreSQL persistence.

The hosted fictional sample demonstrates exact-phrase repair, reviewed image replacement, simulated conflict detection and one verified sample update with two skipped posts. Sample operations never call Buffer.

Live writes are blocked because write authorization has not been granted. No real post was created, repaired or scheduled in this sprint, and no new Meta permissions were requested.

November additions include downloadable repair reports, guided first use, production configuration checks, durable deployment and visible read receipts. The underlying October implementation remains identified as pre-window work. Next steps are organizer walkthroughs, backup restoration testing and a real repair only if separately authorized. No measured time savings or customer demand are claimed.

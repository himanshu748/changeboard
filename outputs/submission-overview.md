# Changeboard — overview draft

**Unsubmitted draft · 25 October 2026.** This describes the implemented local application and its current limits. Replace pending statements only after obtaining the corresponding live evidence. A temporary HTTPS endpoint and scoped client now exist; the durable release URL and submission details remain pending.

---

Changeboard is designed for independent workshop organizers and small venues that schedule event announcements in Buffer. When a date, time or venue changes, the old information can remain scattered across differently written captions, reminder schedules and graphics. Changeboard makes those dependencies visible without asking the organizer to rewrite the campaign.

The implemented local application lets an organizer select up to six posts, confirm event facts, and connect exact caption phrases to those facts. Deterministic suggestions and manual occurrence selection support the review; AI extraction is currently unavailable. Changing a fact produces complete before-and-after captions while preserving unrelated wording. Confirmed associations and verified snapshots persist so a second change can reuse them.

The review includes timezone-aware publication context, controlled relative expressions such as “tomorrow,” explicit scheduling choices, and image review tied to each fact revision. Organizers can inspect a generated event poster or upload a replacement. A repaired caption never automatically clears an image warning. A changed source snapshot withholds the operation and requires fresh review.

Approved changes become immutable server-side change sets. A durable worker tracks each operation, checks its source before writing, and verifies its outcome afterward. Individual failures, skipped posts and uncertain outcomes remain visible. Published announcements use separately reviewed correction drafts; the original public post is not edited.

The Buffer adapter implements OAuth with PKCE, account and channel discovery, bounded post reads, narrow editPost mutations and draft creation. Tokens are encrypted server-side, refresh is serialized, and rate-limit cooldowns are retained. These contracts have local and simulated test evidence. First-account OAuth, owned-Page discovery and a bounded empty post read now pass through temporary HTTPS. Second-account isolation, real mutations and public-media acceptance remain unverified; live write formats stay disabled. The working sample is explicitly fictional and never calls Buffer.

Next steps are authorized live validation, public deployment, observed organizer walkthroughs, and measuring repair effort against their manual process. Work completed on October 25 is recorded as pre-window work, not eligible-window functionality.

---

Submission preparation still requires the verified public URL, app client ID, live working video, entrant details, and an accurate account of new eligible-window functionality. This file has not been submitted or published. Customer need, willingness to pay and time savings remain unvalidated.

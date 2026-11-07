# Changeboard: Product Requirements Document

Version 1.0 | Prepared 25 October 2026 | Implementation handoff

## 0. Instructions to the coding agent

Build Changeboard as a working web application from this PRD. Inspect the repository and its existing instructions first. Reuse suitable existing infrastructure and preserve unrelated work.

Before implementing the interface:

1. Save this document as `PRD.md` in the project root.
2. Create a project-specific `design.md` in the project root, following Section 4. It must contain concrete design decisions, representative content, layouts, interactions, and states. Complete it before writing UI components.
3. Create `CHECKLIST.md` with stable requirement IDs, implementation phases, acceptance evidence, and an unchecked status for unfinished requirements.
4. Create `docs/api-verification.md` to record verified Buffer operations, limitations, source URLs, and live-test outcomes.

Proceed from documentation to implementation and verification. Keep these files synchronized with the actual application. A finished plan, static interface, or mocked integration is not a completed product.

Make routine implementation decisions independently. When a missing credential blocks one integration, finish independent work, clearly label the blocked acceptance criteria, and state the exact input required. Do not fabricate successful connections, tests, users, or deployment.

## 1. Product definition

Name: Changeboard.

Tagline: Change one event fact. Repair the campaign.

Primary user: an independent workshop organizer or small venue that already schedules distinct announcements and reminders in Buffer.

Problem: an event's date, time, or venue changes after its campaign is scheduled. The old information appears in different captions, relative expressions, graphics, and reminder times. Correcting one post leaves the others inconsistent.

Product: import selected existing Buffer posts, connect their exact factual phrases to user-confirmed event details, and remember those relationships. When the organizer changes a fact, propose precise updates, show unresolved items, and apply only approved changes.

The differentiating mechanism is persistent fact associations in independently written posts. A second event change must reuse the confirmed associations. Preserve the writing surrounding those facts.

The customer need and willingness to pay remain hypotheses. Bulk editing and campaign rescheduling already exist. Do not claim universal novelty or guarantee contest results.

## 2. Competition requirements

The intended event is Buffer Commit 2026. The judged build window is October 28 through November 13. Submission closes November 13 at 11:59 p.m. Pacific, equivalent to November 14 at 1:29 p.m. IST.

Required deliverables include a public application using Buffer OAuth, successful live API calls, a working video of at most two minutes, an approximately 300-word overview, and the app client ID. Keep the application live through judging.

The equally weighted criteria are usefulness, technical craft, and originality. Record pre-window work separately and identify the functionality built during the eligible period. Recheck official requirements before submission. Prepare submission assets without claiming the entry has been registered or submitted.

## 3. Goals, scope, and success criteria

### Product goals

- Repair a campaign the user already wrote.
- Preserve unrelated wording and user control.
- Keep captions, selected graphics, and publication times consistent with confirmed facts.
- Make coverage, conflicts, partial results, and uncertainty visible.
- Demonstrate the central workflow through the live Buffer API.

### MVP boundaries

- One event per campaign.
- Up to six selected draft or scheduled posts.
- Optional separate selection of one published announcement for a correction draft.
- Facts: event date, start time, venue name, and venue address.
- One confirmed IANA event timezone, with explicit handling of channel timezone differences.
- Ordinary text and single-image posts on initially tested Facebook Page and Instagram professional-account channels.
- A user with one supported channel can complete the workflow.
- Exact factual phrases and a controlled relative vocabulary: today, tomorrow, and in N days.
- One deterministic event-poster template.
- English interpretation initially. Preserve other text without interpreting it.

Enable each channel/format only after its live behavior is verified. Treat unsupported formats and permissions as explicit states.

Defer general content generation, video, carousels, threads, ticket inventories, website scraping, analytics, continuous monitoring, payment collection, and additional fact types.

### Validation targets

Observe three users completing a realistic campaign repair if participants are available. Record time, missed facts, confirmation burden, and completion without assistance. Compare with their manual process.

Aim for a meaningful reduction in work; report measured results only. Lack of user access remains an unvalidated product assumption.

## 4. Mandatory project-specific design.md

Create `design.md` before UI implementation. This file is a required deliverable, not a placeholder or a generic design checklist. It must explain how Changeboard's particular workflow becomes a usable interface.

Include all of the following:

### A. Design concept

Use a calm editorial workspace organized around an event fact sheet and the posts being corrected. Make exact changes, publication context, and outstanding work the visual priorities.

Document the first-use journey, returning-user journey, navigation, and primary action on every screen.

### B. Concrete visual system

Starting direction:

- Canvas: warm off-white, approximately #F7F5F0.
- Surfaces: white.
- Primary text: charcoal, approximately #171C1C.
- Confirmed changes and primary actions: restrained teal, approximately #0F766E.
- Review warnings: amber, approximately #92400E.
- Failures: red, approximately #B42318.
- Borders: quiet gray-green, approximately #D7DEDC.

Choose final accessible foreground/background combinations and record them.

Use a readable system sans-serif or Inter, generous caption line spacing, tabular dates, a consistent spacing scale, modest corner radii, and restrained shadows.

Specify typography sizes, component dimensions, spacing, borders, focus styles, disabled states, and motion behavior. Pair every status color with text and an icon.

### C. Four core screens

1. Choose posts:
   Connected organization, channel filters, readable caption cards, media thumbnails, status, local scheduled time, selection count, and a persistent Review facts action.

2. Connect facts:
   Event fact sheet beside the selected posts, suggested phrase associations, confirm/change/ignore controls, and visible interpretation of relative dates.

3. Review changes:
   Complete before/after captions, highlighted changed fragments, schedule choices, media review, conflicts, per-post selection, and an action labeled with its exact scope.

4. Results:
   Individual verified outcomes, unresolved work, refreshed-review actions, connection recovery, and correction drafts shown separately.

Include a small public introduction that explains the benefit before OAuth, plus useful empty states for no channels and no suitable posts.

### D. Signature interaction

Selecting a fact highlights its confirmed references across the selected posts. Changing the fact reveals exact proposed differences.

For tomorrow, show both the publication date and event date so the interpretation is understandable.

Preserve surrounding caption text in the comparison. Show source, current Buffer version, and proposal when resolving an observed external edit.

### E. Component and state specification

Define:

- EventFactSheet
- PostCard
- FactReference
- CaptionDiff
- ScheduleChoice
- MediaReview
- ConflictPanel
- ApplySummary
- ResultRow

Required labels include:

- Needs confirmation
- Ready to update
- Image needs review
- Changed in Buffer
- Already published
- Updated and verified
- Update failed
- Outcome uncertain

A primary action should say Apply updates to 3 posts, with the actual count.

Outstanding items must remain visible after partial success.

### F. Responsive and accessible behavior

Desktop: paired fact/review panes with readable line lengths.

Mobile: stacked cards, inline fact context, full-width comparisons, and a persistent action area that does not cover content.

Verify at approximately 375px and 1440px widths.

Require keyboard operation, visible focus, semantic form labels, announced asynchronous results, accessible insertion/deletion descriptions, sufficient contrast, and reduced-motion behavior.

Do not communicate differences through color alone.

### G. Representative content and verification

Use the sample campaign in Section 5, including a stale image and a real conflict scenario.

Define loading, empty, expired-session, unsupported-format, partial-success, and uncertain-outcome screens.

Record a visual review plan. Compare implemented screens against design.md in a browser and document material deviations.

Resolve design decisions rather than leaving TODOs for the central workflow.

## 5. Representative scenario

Use a clearly labeled Sample campaign called Clay After Hours.

Original event:
Saturday, November 21, 2026, 6 p.m., Mill Studio.

Changed event:
Sunday, November 22, 2026, 4 p.m., River Studio.

Timezone:
Europe/London.

Example captions:

- Join Clay After Hours at Mill Studio this Saturday. Materials and tea included.
- Tomorrow at 6 p.m.: an evening of clay, conversation, and making something by hand.
- Saturday plans? Meet us at Mill Studio. Bring a friend; we will bring the clay.

Include one flyer with the old details, one post edited directly in Buffer after import, and one separate published announcement.

Static examples may use these dates. Live test fixtures must use valid future times and owned test channels.

Keep sample mode visibly separate from live account data.

## 6. User journey and functional requirements

### FR-01: Connect an ordinary Buffer account

Use public OAuth with PKCE. Discover accessible organizations and channels under that user's credentials.

Let the user explicitly choose the organization. Honor channel permissions, approval restrictions, and allowed actions.

Show connected, denied, expired, revoked, and reconnect states.

Never substitute a developer's personal API key for the public-user flow.

### FR-02: Select existing posts

Fetch a bounded, paginated set filtered by channel, status, and date.

Display caption, media, publication time, and timezone.

The user selects the posts. Do not automatically adopt unrelated content.

Explain why a format cannot be repaired. Separate published announcements from editable posts.

### FR-03: Confirm source facts and associations

Ask the user to confirm the current event facts. AI may suggest them and their exact references, but inferred values remain unconfirmed.

Each association links an exact caption span to a fact or supported temporal expression.

The user can confirm, reject, select a different occurrence, or create a binding manually.

Preserve the original facts and source snapshots. Editing proposed new facts creates a new revision rather than destroying the baseline.

### FR-04: Prepare a repair preview

Compute changes only for confirmed associations.

Show original and proposed complete captions, changed spans, scheduling effects, media status, and the reason for each proposed change.

Never silently change a date, venue, publication time, or unconfirmed phrase.

Allow the user to exclude individual operations.

### FR-05: Keep associations across changes

After a verified update, persist the new source snapshot and association positions.

A subsequent event change must reuse valid associations.

A post edited externally invalidates affected associations. Require a new review rather than applying old positions to changed text.

### FR-06: Handle images honestly

Every attached image has a review status tied to the current fact revision.

External images default to Needs review. The user may confirm they remain accurate, upload a replacement, or explicitly choose a generated event poster.

A caption repair does not prove image accuracy.

Missing OCR or an OCR result with no match must never produce an all-clear result. OCR is optional.

### FR-07: Apply only the approved change set

Create an immutable change set from the displayed preview.

Apply by its server-side ID and revision, not by accepting arbitrary mutation payloads from the browser.

Any changed facts, source snapshots, or selected operations invalidate the old approval.

Apply only eligible, explicitly selected operations.

### FR-08: Resolve partial outcomes

Report successful, conflicting, failed, skipped, and uncertain operations individually.

Preserve unresolved work across refreshes and sessions.

A skipped scheduled post remains scheduled. Say so clearly and offer an explicitly reviewed Move to Draft action where supported.

Do not imply that skipping automatically stops publication.

### FR-09: Prepare correction drafts

For a selected published announcement, propose a new correction using confirmed old and new details.

Let the user review its text and destination before creating a new Buffer draft.

Do not imply that the original public post was edited, deleted, or corrected on the social network.

## 7. AI and text integrity

AI is a bounded extraction assistant. It proposes source facts, exact references, and interpretations in a validated structured response.

It does not independently authorize or execute Buffer operations.

Validate:

- Source substrings.
- Occurrence selection.
- Nonoverlapping ranges.
- Allowed fact identifiers.
- Source fingerprints.

Use a consistent Unicode indexing scheme. Repeated phrases and multiple-event captions require explicit disambiguation.

Retain literal caption segments exactly.

Do not rewrite tone, expand claims, invent details, or alter unrelated links and punctuation.

Exclude posts with structured mention annotations until their positional metadata can be reconstructed and tested.

Treat captions and imported material as untrusted data. Instructions embedded in a caption must not become application instructions.

Provide manual association controls when AI is unavailable and label the unavailable feature accurately.

## 8. Time and scheduling behavior

Use timezone-aware calendar arithmetic.

Store IANA zones and UTC instants where appropriate. Keep date-only values distinct from timestamps.

Relative expressions require a confirmed fixed customScheduled time.

For a floating queue slot, require approval to fix the publication time or replace the expression with an explicit event date.

Offer two explicit choices for suitable posts:

- Keep publication time and recompute its factual wording.
- Preserve a user-confirmed reminder offset and propose a new fixed publication time.

Do not infer scheduling intent for every post automatically.

Flag unsupported expressions, past schedules, nonexistent local times, and ambiguous daylight-saving times.

Accuracy is checked against the observed schedule. Later changes in Buffer require fresh synchronization and review.

Introduce a configurable application cutoff, initially ten minutes before publication, inside which automatic repairs are withheld.

This is an application policy, not a guarantee from Buffer.

## 9. Buffer integration and execution

Verify the current schema before implementation.

Use typed adapters for account/channel discovery, post reading, editPost, and correction-draft creation.

Record actual payloads and responses with credentials removed.

Preserve unspecified text, assets, metadata, tags, and scheduling.

Construct the smallest appropriate edit. Distinguish omitted fields from null and empty values.

Keep existing approval policy intact.

Before each write:

1. Re-fetch the relevant current post fields and permitted actions.
2. Confirm ownership, supported format, status, and publication cutoff.
3. Compare current content, media, relevant metadata, and schedule with the approved snapshot.
4. If anything relevant changed, withhold the operation and regenerate the preview.
5. Otherwise perform the approved mutation and inspect its actual result.

Use local job locks and unique operation IDs to prevent duplicate local execution.

Persist operation state before external calls.

Inspect both GraphQL-level failures and mutation-level error variants.

Model outcomes as:

- pending
- running
- succeeded
- needs_review
- failed
- skipped
- uncertain

For a timeout or dropped response, reconcile the remote state before retrying.

An unresolved ambiguous outcome remains uncertain.

Multi-post changes are individually applied.

Do not claim atomic batches, remote exactly-once delivery, guaranteed rollback, or elimination of simultaneous-edit races.

Use deliberate refresh, cached account/channel discovery, bounded reads, and rate-limit headers.

Honor Retry-After and never retry aggressively.

Keep analytics and webhook-dependent behavior outside the MVP.

## 10. Authentication, storage, and media

Request the minimum scopes needed for the product:

- account:read
- posts:read
- posts:write
- offline_access

Verify their current availability.

Keep tokens server-side and encrypted at rest. Validate OAuth state and exact HTTPS callback configuration.

Serialize refresh per connection and atomically store the replacement token pair.

Handle revocation through reconnect.

Authorize every local resource by its owning user and organization. A submitted Buffer post ID does not prove access.

Keep secrets out of logs, source control, screenshots, and browser storage.

Use a stable, distinct public URL for each generated poster revision.

Retain an asset while a scheduled post still references it.

Public media should contain only material the user intends to publish.

Generate appropriate alt text for replacement images and review positional image tags.

Do not blindly copy metadata from a different image.

Show the exact replacement before applying it.

Provide disconnect and data-deletion controls. Explain whether disconnecting leaves existing Buffer posts scheduled.

Deleting local records must not silently delete or alter remote posts.

## 11. Suggested implementation structure

Use one TypeScript web application with React, a server-side API layer, PostgreSQL, durable operation records, a small worker, and public object storage.

Reuse a suitable existing stack. Pin compatible dependency versions after checking current documentation.

A database-backed job queue is sufficient if it handles leases, crash recovery, and uncertain outcomes correctly.

A graph database, vector store, and autonomous agent framework are unnecessary for the defined requirements.

Core records:

- User and BufferConnection:
  Account identity, organization, encrypted credentials, scopes, expiry.

- Campaign and FactRevision:
  Event facts, timezone, revision history.

- LinkedPost and PostSnapshot:
  Remote IDs, source content, metadata, schedule, fingerprints.

- FactBinding:
  Confirmed phrase/expression, source revision, position, validation state.

- MediaReview and GeneratedAsset:
  Asset revision, review status, retained references.

- ChangeSet:
  Immutable approved proposal and source revisions.

- Operation:
  Target, before state, intended changes, attempt/result history.

Keep OAuth, Buffer access, binding extraction, deterministic repair, temporal calculations, rendering, and execution in distinct modules with clear interfaces.

The browser requests preview and apply by application resource IDs.

Server authorization and validation remain authoritative.

## 12. Required verification

Implement meaningful tests for these behaviors:

1. A second ordinary account connects and can access only its permitted resources.
2. Token refresh is serialized and revoked credentials produce a reconnect state.
3. Confirmed replacements preserve unrelated text, including Unicode and duplicate phrases.
4. Ambiguous or overlapping associations require review.
5. Tomorrow and date-offset cases work across timezone and daylight-saving boundaries.
6. Floating queue slots cannot silently receive supposedly permanent relative wording.
7. External images remain unresolved until explicitly reviewed for the current facts.
8. Structured mentions are blocked until supported.
9. A direct Buffer edit after preview causes a fresh review.
10. A sending, sent, or near-publication post is withheld correctly.
11. Metadata and media survive narrow edits; replacement-image metadata is correct.
12. Partial failure remains visible and does not erase successful or unresolved operations.
13. Duplicate requests and uncertain create outcomes do not trigger blind duplicate creation.
14. A correction creates a new draft with the approved content and destination.
15. A second fact change reuses valid confirmed bindings.
16. The core flow works on mobile, with keyboard input, and after page refresh.

Separate deterministic tests, adapter simulations, and live integration evidence.

Simulated responses do not satisfy live OAuth or mutation gates.

Document unexecuted cases honestly.

## 13. Phases and completion evidence

### Phase 1: Foundation

Deliver PRD.md, design.md, CHECKLIST.md, application scaffold, database, and connection flow.

Exit when the design decisions are concrete and a second account completes deployed OAuth.

### Phase 2: Existing-content import

Deliver organization selection, bounded post selection, snapshots, format checks, and explicit empty/error states.

Exit when real existing posts appear accurately.

### Phase 3: Fact associations

Deliver extraction suggestions, manual confirmation, exact-span validation, persistent bindings, and deterministic repair.

Exit when unrelated writing survives and repeated changes work.

### Phase 4: Complete review

Deliver time choices, before/after views, image coverage, the poster template, and correction preview.

Exit when every affected post has a comprehensible outcome or unresolved reason.

### Phase 5: Reliable execution

Deliver approved change sets, pre-write checks, durable operations, reconciliation, draft handling, and results.

Exit when direct edits, partial failures, and unknown outcomes are handled correctly.

### Phase 6: Release quality

Deliver accessibility review, mobile polish, fresh-user walkthroughs, deployment documentation, demo script, and submission overview.

Exit when the working flow and evidence match this PRD.

For each checklist item record:

- Status.
- Implementation location.
- Verification method.
- Evidence.
- Remaining limitations.

Mark complete only after the stated result is observed.

Keep blocked items distinct from complete items.

## 14. Demo and submission assets

Target a 110 to 118 second demo:

- Show an existing campaign and the changed event details.
- Confirm its fact associations.
- Show precise caption changes and the relative-time consequence.
- Review the poster and an unresolved external image.
- Show an observed direct Buffer edit being withheld.
- Apply selected updates and verify the actual Buffer results.
- Show a correction draft and the remaining unresolved-item count.

Use labeled fictional content and owned test accounts.

Identify any prepared setup.

Rehearse against real response times and keep the live end-to-end proof visible.

Prepare an approximately 300-word submission overview describing:

- The problem.
- Intended audience.
- Actual functionality.
- Buffer API use.
- Next steps.

Include only implemented features.

Prepare public-progress drafts separately from publishing them.

## 15. Definition of done

The project is complete when:

- A fresh user can connect their own Buffer account and repair suitable existing posts.
- Confirmed facts and associations persist and support a second change.
- Caption, schedule, image, and external-edit limitations are represented truthfully.
- Approved operations produce verified individual outcomes without hiding partial failures.
- Published announcements use separate correction drafts.
- The interface matches the project-specific design.md and passes the core accessibility checks.
- Required live integration gates have evidence or remain explicitly blocked.
- README, environment setup, migrations, privacy/data behavior, CHECKLIST.md, and API-verification notes are current.
- The demo and written overview match the application that actually runs.

Finish with a concise report containing the running URL where available, completed requirements, verification evidence, unresolved issues, and exact remaining external inputs.

Do not describe the entire project as complete while core acceptance gates remain blocked.

## 16. Authoritative references

Recheck these during implementation:

- Buffer Commit terms:
  https://buffer.com/api/commit/terms

- Event overview:
  https://buffer.com/api/commit

- Building public apps:
  https://developers.buffer.com/guides/building-apps.html

- Authentication:
  https://developers.buffer.com/guides/authentication.html

- API reference:
  https://developers.buffer.com/reference.html

- Post editing:
  https://developers.buffer.com/types/EditPostInput.html

- Scheduling:
  https://developers.buffer.com/guides/posts-and-scheduling.html

- Efficient API usage:
  https://developers.buffer.com/guides/efficient-api-usage.html

- Rate limits:
  https://developers.buffer.com/guides/api-limits.html

- Media hosting:
  https://developers.buffer.com/guides/hosting-media.html

- Metrics restrictions:
  https://developers.buffer.com/guides/post-metrics.html
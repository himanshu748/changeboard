# Changeboard design specification

Design resolved before UI implementation · 25 October 2026 · pre-window work.

## Concept and journeys

A calm editorial workbench: the event is a shared source of facts, and the campaign is a set of independent pieces of writing. The signature interaction is selecting a fact in the left sheet and seeing its precise references highlighted in the right pane. An amended fact produces a reviewable comparison; it never rewrites the whole caption.

First visit: a small public introduction explains “Change one event fact. Repair the campaign.” A diagram-like sample shows Mill Studio → River Studio inside otherwise unchanged copy. Primary action: “Try the sample campaign”; secondary: “Connect Buffer”. The sample is labeled fictional throughout. No connection or remote success is implied.

First use: Choose posts → Connect facts → Review changes → Results. The header carries Changeboard, Campaign workspace, connection state, and a settings control. A numbered horizontal stepper carries workflow position. The page title, short explanatory sentence, count, and bottom action bar provide continuity. Back navigation retains server state. Returning visitors resume their last saved campaign and can inspect past results or start the next change, reusing confirmed associations.

## Visual system

Canvas #F7F5F0, surface #FFFFFF, text #171C1C, muted text #596763, teal #0F766E, teal wash #EAF5F0, border #D7DEDC. Amber text #92400E on #FFF5DF; red #B42318 on #FFF0ED. White text on primary teal. Do not place small gray text below these contrast levels. All state labels include an icon and words, not color alone.

Use system sans-serif (`Inter`, `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, sans-serif); use Georgia only for a large editorial introduction and poster lettering. Body 15px / 1.65; captions 16px / 1.75. Metadata 12px / 1.5; labels 13px / 1.4, medium weight; screen headings 30px / 1.2, -0.03em tracking; hero 64px / 1.05. Dates use tabular numerals. No remote font dependency.

Spacing scale: 4, 8, 12, 16, 24, 32, 48, 64px. App width 1220px, 40px desktop gutters, 20px mobile gutters. Header 76px. Fact sheet 300px; content flexes, caption lines stay below 75 characters. Cards have 1px borders, 10px radii, 24px padding and optional `0 3px 14px #172B2310` shadow. Buttons minimum 44px high, 16px horizontal padding; inputs 44px, 7px radius. Small tags 26px high. Checkboxes 18px with a larger label hit area. Bottom action area has generous breathing room and an opaque background.

Focus: 3px #0F766E outline with 3px offset. Disabled buttons have explicit disabled semantics and adjacent reason text where the cause is not evident. Links are underlined on hover/focus. Controls do not depend on hover. Dialogs use native dialog semantics, labeled titles, close controls and focus return.

Motion: corporate/calm, 120ms hover, 180ms state transition, 220ms small 4px reveal. Curve cubic-bezier(.2,0,0,1). Only reference selection, visible progress and changed-state feedback move. No ambient animation or obligatory decorative layers. Reduced motion removes transforms and sets transitions to none. Frequent form edits are instant.

## Screen 1 — Choose posts

Eyebrow “CAMPAIGN / 01”, title “Start with the posts you already wrote.” Organization selection sits above channel/status/date filters. A labeled Sample campaign panel shows Clay After Hours and original facts. Each PostCard shows an explicit checkbox, channel icon/name, Draft/Scheduled label, publication date and IANA timezone, full caption and a small poster thumbnail if attached. Unsupported posts have the exact reason and an unavailable checkbox. Published content is in a separate correction-announcement section with at most one selection.

Primary action “Review facts” accompanies “3 of 6 posts selected”. No content is selected automatically in live mode. The sample may suggest all three but requires a visible user confirmation. Empty account: “No channels available” with reconnect guidance. No suitable results: filters remain usable; explain supported text/single-image posts and selected date range. Pagination is a deliberate “Load more” control, capped on the server.

## Screen 2 — Connect facts

Title “A few facts. Connected everywhere.” EventFactSheet left contains confirmed original date, time, venue, optional address, and IANA zone. Facts require explicit confirmation before generating a preview. A selected fact has a teal left rule and counts of confirmed references.

The right column shows full source captions with suggested phrases as outlined marks; confirmed phrases have a teal wash and link icon. Each FactReference has fact type, exact phrase, occurrence and Confirm / Ignore controls. A manual form accepts a phrase, occurrence and fact type. No AI service is configured initially: use the accurate label “Exact-match suggestions · manual review” and explain that AI extraction is unavailable. Duplicate phrases are separate choices; overlapping spans are rejected. The source facts are saved independently from the proposed facts.

After confirmation, a clearly divided “What changed?” section edits proposed date, time, venue and address. Sample action “Use the example change” sets Sunday 22 November, 16:00, River Studio only when selected. Primary action “Preview changes” saves a new revision. Original facts stay visible. The next change starts from last verified bindings and snapshots.

## Screen 3 — Review changes

Title “Small changes. The whole picture.” A compact revision summary shows old → new details. Each post has operation selection, eligibility status and full before/after captions in paired panes. At 375px these stack. Deletions are struck through and labeled “Removed”; insertions underlined and labeled “Added”. Unchanged text remains in both panes.

ScheduleChoice offers “Keep publication time” and “Preserve reminder offset” only when the source has a confirmed fixed instant. The offset is shown and requires explicit acknowledgement. Floating slots require a fixed local time or “Use the explicit event date”. For “Tomorrow”, show “Published Fri 20 Nov · event Sat 21 Nov” and resulting dates. Show event and channel zones when different. Cutoff is explicitly “Changeboard’s 10-minute safety window”.

MediaReview always lists attached images. The stale flyer begins “Image needs review”. Choices: “Image is still accurate”, “Replace image” upload with alt text, or “Use updated event poster”. Show the exact generated or uploaded image before acknowledgement. Review belongs to a revision; changing facts invalidates it. An unrelated accurate photo can be confirmed, never inferred accurate by missing OCR.

ConflictPanel shows “Changed in Buffer”, imported source, current source and withheld proposal. “Refresh source and reconnect facts” invalidates the old approval. The sample uses a separately stored simulated remote post to produce a real comparison mismatch; label that source as simulated. Approval is per eligible post. Primary action is “Apply updates to N posts”. It sends only an immutable server change-set ID/revision. A selected published post has a separate correction text/destination review and “Create correction draft” action.

## Screen 4 — Results

Title “Here’s where your campaign stands.” ApplySummary counts verified, needs-review, failed, skipped and uncertain results without collapsing them into a success banner. ResultRow shows target caption/channel, operation, timestamp and exact status. Required labels: “Updated and verified”, “Update failed”, “Outcome uncertain”, “Changed in Buffer”, “Already published”, “Needs confirmation”, “Ready to update”, “Image needs review”. In sample mode use “Verified in sample” and a persistent “No Buffer posts changed” notice.

Unresolved work remains after refresh and later visits. Skipped scheduled posts say “Still scheduled in Buffer” (or “Still scheduled in sample”); move-to-draft is a distinct explicitly reviewed action. Uncertain writes offer “Check outcome” before any retry. Corrections have their own section and state that the original published announcement was not modified. Primary actions: “Review remaining work”, then “Make another change”.

## Components and states

EventFactSheet owns original/proposed context, fact selection and revision. PostCard owns selection, platform/status/schedule context and complete copy. FactReference owns occurrence/confirmation state. CaptionDiff renders full captions with semantic del/ins and accessible descriptions. ScheduleChoice owns explicit schedule intent. MediaReview owns revision-scoped image coverage, previews and alt text. ConflictPanel owns the three-version comparison. ApplySummary and ResultRow own individual operation outcomes.

Loading: stable page shell, descriptive status “Loading your posts…”, disabled dependent controls. Async errors use role=alert, field-level errors and retry, preserving inputs. Expired or revoked session: reconnect banner and disabled remote actions; local work remains. Unsupported format: exact visible reason, no repair control. Partial success: retain every row. Uncertain outcome: amber, no optimistic success and no blind creation retry. Connection settings explain disconnect and local deletion, and that remote posts remain scheduled. A confirmation dialog protects local deletion.

## Responsive/accessibility verification

At 1440px inspect paired panes, header and action area; at 375px stack facts and cards, wrap step labels, make buttons full width and prevent horizontal scroll. The action bar uses sticky positioning in flow with safe-area padding, never fixed over content. All controls have semantic labels, visible focus, keyboard operation and ≥44px main targets. Async completion is announced in a polite live region; failures in an alert. Focus moves to each new screen heading. Use no drag-only association controls.

Browser walkthrough must cover selection, confirmations, exact diff, stale image, external conflict, selected apply, persisted results, second change, keyboard traversal and reduced motion. Compare implemented screens to these decisions and record deviations in docs/verification.md. No three-user validation or live provider behavior is implied by browser screenshots.

## Representative content

Clay After Hours · Sample campaign. Original: Saturday 21 November 2026, 18:00, Mill Studio, Europe/London. Revision: Sunday 22 November 2026, 16:00, River Studio. Captions are copied verbatim from PRD section 5. One handcrafted typographic clay-workshop flyer shows old details; one current simulated remote caption gains “Doors open early.” after import; one separate published announcement enables a correction draft. No invented customers, metrics, endorsements or measured savings.

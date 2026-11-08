# Changeboard demo script — sample rehearsal

Prepared 25 October 2026; updated 8 November 2026 with the repair-report feature. **Rehearsal draft, not a recorded video or submission.** The current demonstration uses the clearly labeled fictional Sample campaign and simulated Buffer state. No successful live OAuth connection, API mutation, or public deployment is asserted by this script.

The spoken track below is for the current sample rehearsal. Keep “Sample campaign” and “No Buffer posts changed” visible. A sample recording does **not** satisfy the contest's live API demonstration requirement.

## Prepared setup

- Run the local application at `http://127.0.0.1:4310` and open the fictional Clay After Hours campaign.
- Use the original Saturday 21 November 2026, 18:00, Mill Studio facts in Europe/London. The example change is Sunday 22 November, 16:00, River Studio.
- Have the three selectable posts and the separate published sample announcement available. Keep the source captions and old flyers intact.
- For a practiced 116-second take, select the posts and confirm all but one association beforehand. Say that this selection and part of the review were prepared. Do not imply that extraction or confirmation was automatic.
- Leave the second post's image unresolved. Use the first post to demonstrate the replacement poster. Use the third post for the simulated external edit. This should leave one eligible campaign update; use the actual displayed count if the fixture differs.
- Do not record tokens, cookies, authorization codes, client secrets, account settings, or unrelated account content. Current AI extraction and OCR are unavailable; this flow uses deterministic suggestions and manual confirmation.

## Timed sample rehearsal

| Time     | Visible action                                                                                                                                | Spoken track                                                                                                                                                            |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0–8s     | Show the introduction, then the labeled Sample campaign.                                                                                      | “Changeboard connects event facts to the posts you've already written. This is a fictional sample; it makes no changes in Buffer.”                                      |
| 8–19s    | Show the three complete captions, original facts, schedules and separate published announcement.                                              | “Clay After Hours is moving. These announcements have different wording. I've prepared the post selection and part of the fact review.”                                 |
| 19–34s   | Select Venue in the fact sheet; show highlighted references across captions. Confirm the remaining exact phrase. Show one occurrence control. | “Each association points to an exact phrase. I confirm the references; the rest of the writing stays untouched. A later change can reuse these associations.”           |
| 34–48s   | Choose “Use the example change”, then “Preview changes”. Show full caption comparisons and the reminder's publication/event dates.            | “The event moves to Sunday at four, at River Studio. Keeping this Friday publication means ‘Tomorrow’ becomes ‘In 2 days’. The dates make that interpretation visible.” |
| 48–62s   | On post one, choose “Use updated event poster”, open its exact preview and acknowledge it. Briefly show post two's unresolved image.          | “The old flyer is stale. I review this replacement before approving it. The other image still needs review, so that post stays unresolved.”                             |
| 62–75s   | On post three, use “Simulate edit in Buffer”. Refresh the preview if needed; show imported, current and proposed text.                        | “This control simulates a separate source edit. Changeboard sees that the saved snapshot no longer matches and withholds the update.”                                   |
| 75–91s   | Inspect selected operations and exact action count. Apply the eligible update. Show its individual result, then reload once.                  | “I approve this one update. The worker records it, checks the source and verifies the result in the sample. The other posts remain visible—and still scheduled.”        |
| 91–106s  | Show the separate correction text and destination. Save its preview, acknowledge review and create the sample draft.                          | “The published announcement gets a separately reviewed correction draft. Its original public post is unchanged. Here, draft creation is also simulated.”                |
| 106–116s | Show unresolved rows, then “Make another change” and the retained confirmed references.                                                       | “Confirmed associations are retained for the next change. Live OAuth, real Buffer writes and fresh-user testing are the remaining proof gates.”                         |

**Target duration: 116 seconds.** Practice against actual UI and response times. This is a timing allocation, not evidence of a completed timed rehearsal. If the action cannot finish within its slot, shorten narration or repeat the take; do not replace a pending or uncertain result with a fabricated success state.

## Converting this into a submission-eligible live demonstration

Only record a live version after the gates in `docs/live-validation.md` have actually passed. A registered OAuth app, exact HTTPS callback, authorized public hosting, a second ordinary account, and owned supported test channels are still required. Use newly prepared future-dated fixtures; do not rely on the static sample dates after they cease to be suitable.

Keep the same 116-second structure, but make these changes explicit:

1. Show the public app's connected organization and the real existing test posts imported under OAuth. Identify any completed consent and prepared selections as setup. Use only a channel/format backed by a dated live-test receipt; one verified Facebook Page is sufficient for the central flow.
2. Make the external edit directly in Buffer after preview. Refresh Changeboard and show that the real mismatch is withheld. Do not use the sample simulation control.
3. Keep the approved application request, its actual completion and the Buffer readback visible. Show the changed caption, retained schedule or approved new schedule, and replacement image in Buffer. Do not cut away from an unresolved operation and return to an unexplained success screen.
4. Create the reviewed correction as a real new Buffer draft on the authorized test destination. Show its draft status and the unchanged original announcement. The current application's live text-only correction flow is for verified Facebook Page channels; Instagram correction-image review remains a separate gate.
5. Replace the closing “remaining proof gates” wording only with evidence actually obtained. Continue to identify unresolved image/conflict rows. Report the observed counts, not the expected fixture counts.

Before submission, verify the actual exported video duration is at most two minutes, redact only sensitive material without obscuring workflow evidence, recheck the [official terms](https://buffer.com/api/commit/terms), and identify the new functionality built during the eligible window. No live video has been produced by this document.

## November 8 addition: show the handoff

In the result section, briefly download and open the repair report. Show the Sample label, a verified fictional outcome, and the skipped-publication warning. Say: “The report separates proposals from checked outcomes and keeps unresolved work visible for the next organizer.” Replace part of the earlier result narration to preserve the two-minute cap; rehearse the final cut rather than claiming the old timing still holds. The report and first-use guidance are November additions. The underlying repair mechanism is pre-window work and must be identified as such.

A qualifying final take still needs ordinary live OAuth, real nonempty post import, a reviewed repair and provider readback. The sample/report recording is rehearsal evidence only. Generated narration must use Deepgram if narration is later authorized; no speech was generated for this review.

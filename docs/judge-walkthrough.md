# Changeboard: user and judge walkthrough

Reviewed 8 November 2026 against the [Buffer Commit brief](https://buffer.com/api/commit) and [official terms](https://buffer.com/api/commit/terms), last updated October 13. This is a local product review and evidence map, not a submission or a prediction of judging results.

## The user and the useful task

A workshop organizer has already scheduled several differently worded announcements. The venue or date changes. They need to find the references, preserve unrelated copy, check images and reminder times, and know which posts still need attention.

The intended advantage over editing each post manually is reusable, exact associations between event facts and caption phrases, followed by a complete per-post review and an explicit outcome. The new downloadable report supports handing unresolved work to another organizer. User demand, time saved and willingness to pay are hypotheses; no organizer study has been completed.

## Try the local journey

Run `npm ci` and `npm run dev`, then open `http://127.0.0.1:4310`. No account or paid service is needed for this sample. It never calls Buffer.

1. **Try the sample campaign.** Select the three scheduled posts; optionally include the published announcement. Continue to Review facts.
2. **Confirm current facts** without changing the original Saturday / Mill Studio details. Review the six exact phrases and confirm those that refer to the event. The sample deliberately requires your decisions.
3. **Use the example change:** Sunday 22 November, 4 p.m., River Studio. Preview changes. Compare full captions; unrelated writing stays intact.
4. On the first post, **Use updated event poster**. Inspect the preview before acknowledging its event details. On the relative reminder, confirm the fixed publication context to see “Tomorrow” become “In 2 days”; its image still needs a separate review.
5. To examine conflict behavior, expand **Test an external edit** on the third post, simulate the edit and refresh. This changes a separately persisted fictional source, not a Buffer post.
6. Select only the first ready post and **Simulate updates to 1 post**. The sample should record one verified update and two skipped posts. Skipping does not pause the remaining schedules.
7. **Download repair report.** Before applying, it labels proposals as unapplied; after applying, it distinguishes verified, skipped, failed and uncertain outcomes. It contains campaign content, so review it before sharing. It is a saved-state record, not a fresh provider check or tamper-proof certificate.
8. **Make another change**, then **Try another venue**. Confirmed phrases are reused; images must be reviewed again. Unresolved posts retain their own source baselines.

A local sample cannot demonstrate live API repair or satisfy the live-video requirement. Do not hide the Sample workspace label in a recording.

## What the judges can assess

The three official criteria are equally weighted. Each judge scores each criterion from 1–5. No score is estimated here.

| Criterion                       | Product evidence                                                                                                                        | What remains unproven                                                                                                                                  |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Real usefulness                 | Specific event-change task; complete caption comparisons; media/schedule checks; retained unresolved work; downloadable handoff         | Observe organizers using their own workflow and compare repair effort with manual editing                                                              |
| Technical execution and craft   | Exact-span repair, durable operation records, pre-write conflict checks, verified outcomes, isolated downloads and honest sample states | Nonempty live import and repair, refresh/revocation, independent account, stable public media and hosted operations                                    |
| Creativity and originality      | Reusable fact-to-phrase associations and explicit treatment of captions, schedules, images and partial repair                           | No exhaustive novelty claim. Most of this mechanism predates the build window; only the November additions are candidates for judging                  |
| Delight Award, optional         | Coherent responsive review flow, focused guidance and explicit next actions                                                             | Selection is at Buffer’s discretion; no award or competitive advantage is asserted                                                                     |
| Build-in-Public Award, optional | A public source repository exists                                                                                                       | The optional award requires up to five qualifying public social posts. A GitHub repository alone is not that trail; none were published in this review |

## Eligibility and submission gates

The deadline is **13 November 2026, 11:59 p.m. Pacific**, equivalent to **14 November, 1:29 p.m. IST**. Judging is approximately November 16–20; the app must remain live through judging. Buffer is the timekeeper. Recheck the official pages before submitting.

| Required item                                                  | Evidence and status                                                                                                                                                                         |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Registration using the entrant’s verified Buffer email         | Not verified in this review; source publication does not register the entrant                                                                                                               |
| Age, geography, team identity and third-party rights           | Must be confirmed by the entrant; not inferred from machine location or account names                                                                                                       |
| New functionality built during October 28–November 13          | November 8 repair reports and first-use improvements recorded in [build-log.md](build-log.md). October 25 work stays identified as pre-window; only new elements are considered for a prize |
| Publicly hosted, connectable OAuth application                 | Missing durable hosted URL. Historical Quick Tunnel evidence does not establish current availability; a public repository is source access                                                  |
| Successful live API use and end-to-end functioning product     | Historical OAuth/discovery/empty import succeeded. No nonempty live repair evidence; writes remain disabled                                                                                 |
| Video no longer than two minutes showing the live API journey  | Missing. [Demo script](../outputs/demo-script.md) is a rehearsal plan, not a recorded live video                                                                                            |
| Approximately 300-word problem/audience/API/next-steps summary | [Overview draft](../outputs/submission-overview.md) exists; update its status only after the corresponding evidence exists                                                                  |
| API app client ID and entrant/team details                     | Supply through the official form; do not publish secrets, legal-name/email details or account screenshots in source                                                                         |
| Remain online through judging                                  | No durable hosting or monitoring has been verified                                                                                                                                          |

## Next decisive validation

The next product proof is one complete real repair, rather than another cosmetic change. It needs separately approved disposable posts on an owned test channel; the existing authorization is for read-only live testing. The minimal fixture plan is two future-dated text-only drafts containing a fictional workshop venue. Import them through ordinary OAuth, confirm exact references, change the venue, review and apply only the reviewed draft edits, then read them back in Buffer. Demonstrate a source conflict with a separate reviewed fixture and export the resulting report. Do not publish, schedule or delete fixtures without authorization. Enable a live format only after its actual provider behavior is verified, with the gate’s proof requirements respected.

Then validate a second account, stable public hosting/media, and a live recording. A three-organizer study is a useful internal acceptance target, not an official contest requirement. Ask each organizer to perform the task without coaching, identify every unresolved post and interpret a skipped/uncertain result. Record task completion, mistakes and observed manual effort; do not invent quantitative savings.

## Evidence boundary

On November 8, the six-suite automated run passed **84 tests**, including four new report behavior tests and an HTTP/SQL download/isolation/no-mutation test. Strict TypeScript and the production build passed. Chromium browser checks for this revision used an isolated PGlite workspace with no live connection: desktop 1440×1000 and mobile 375×812; six manual phrase confirmations; changed poster inspected before acknowledgement; relative reminder recomputation; separately simulated source conflict; Enter applied exactly one post, two skipped outcomes persisted after reload; preview and result report downloads; second-change preview from River Studio to Garden Studio with a fresh image-review requirement; settings opened by Enter and closed by Escape; six Tab targets had solid 3px focus outlines. Mobile review/results/repeat widths matched the 375px viewport with reduced motion enabled. The unconfigured entry no longer navigated to the raw OAuth configuration error. This is a targeted walkthrough, not organizer research, screen-reader testing or a full accessibility audit. The [October verification](verification.md) remains historical evidence; no live provider write has been added by these tests.

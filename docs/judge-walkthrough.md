# Changeboard: user and judge walkthrough

Reviewed 8 November 2026 against the [Buffer Commit brief](https://buffer.com/api/commit) and [official terms](https://buffer.com/api/commit/terms), last updated October 13. This is a hosted product review and evidence map, not a submission or a prediction of judging results. Official pages were rechecked on November 8.

## The user and the useful task

A workshop organizer has already scheduled several differently worded announcements. The venue or date changes. They need to find the references, preserve unrelated copy, check images and reminder times, and know which posts still need attention.

The intended advantage over editing each post manually is reusable, exact associations between event facts and caption phrases, followed by a complete per-post review and an explicit outcome. The new downloadable report supports handing unresolved work to another organizer. User demand, time saved and willingness to pay are hypotheses. User testing was skipped for this submission at the owner's request; no organizer findings are claimed.

## Try the hosted journey

The [public judge guide](https://changeboard.52.202.25.181.sslip.io/judge.html) separates the account-free sample from the real draft-repair proof and explains the current live-write restriction.

Open [Changeboard](https://changeboard.52.202.25.181.sslip.io) logged out. No account is needed for this fictional sample, and it never calls Buffer. For local development, run `npm ci` and `npm run dev`, then open `http://127.0.0.1:4310`.

1. **Try the sample campaign.** Select the three scheduled posts; optionally include the published announcement. Continue to Review facts.
2. **Confirm current facts** without changing the original Saturday / Mill Studio details. Review the six exact phrases and confirm those that refer to the event. The sample deliberately requires your decisions.
3. Change only **Venue name** to **River Studio**, leaving November 21 and 18:00 unchanged. Preview changes. Compare full captions; unrelated writing stays intact. The separate example-change button changes multiple facts and is not used for this venue-only demonstration.
4. On the first post, **Use updated event poster**. Inspect the preview before acknowledging its event details. The second image still needs a separate review. Changing the venue alone leaves relative date wording unchanged.
5. To examine conflict behavior, expand **Test an external edit** on the third post, simulate the edit and refresh. This changes a separately persisted fictional source, not a Buffer post.
6. Select only the first ready post and **Simulate updates to 1 post**. The sample should record one verified update and two skipped posts. Skipping does not pause the remaining schedules.
7. **Download repair report.** Before applying, it labels proposals as unapplied; after applying, it distinguishes verified, skipped, failed and uncertain outcomes. It contains campaign content, so review it before sharing. It is a saved-state record, not a fresh provider check or tamper-proof certificate.
8. **Make another change**, then **Try another venue**. Confirmed phrases are reused; images must be reviewed again. Unresolved posts retain their own source baselines.

The hosted sample does not demonstrate live API repair. Separately, ordinary deployed OAuth and discovery passed, followed by one authorized text-draft import and actual repair. The live receipt and Buffer readback are separate from the simulated sample. Open **Workspace settings** in the connected browser for actual read metadata. Neither boundary is a claim about an eligible final video. Do not hide the Sample workspace label in a recording.

## What the judges can assess

The three official criteria are equally weighted. Each judge scores each criterion from 1–5. No score is estimated here.

| Criterion                       | Product evidence                                                                                                                        | What remains unproven                                                                                                                                  |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Real usefulness                 | Specific event-change task; complete caption comparisons; media/schedule checks; retained unresolved work; downloadable handoff         | Observe organizers using their own workflow and compare repair effort with manual editing                                                              |
| Technical execution and craft   | Exact-span repair, durable operation records, pre-write conflict checks, verified outcomes, isolated downloads and honest sample states | Broader live formats and campaigns, refresh/revocation, independent-account robustness, Buffer fetching public media, load and off-host recovery       |
| Creativity and originality      | Reusable fact-to-phrase associations and explicit treatment of captions, schedules, images and partial repair                           | No exhaustive novelty claim. Most of this mechanism predates the build window; only the November additions are candidates for judging                  |
| Delight Award, optional         | Coherent responsive review flow, focused guidance and explicit next actions                                                             | Selection is at Buffer’s discretion; no award or competitive advantage is asserted                                                                     |
| Build-in-Public Award, optional | A public source repository exists                                                                                                       | The optional award requires up to five qualifying public social posts. A GitHub repository alone is not that trail; none were published in this review |

## Eligibility and submission gates

The deadline is **13 November 2026, 11:59 p.m. Pacific**, equivalent to **14 November, 1:29 p.m. IST**. Judging is approximately November 16–20; the app must remain live through judging. Buffer is the timekeeper. Recheck the official pages before submitting.

| Required item                                                  | Evidence and status                                                                                                                                                                                                                                            |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Registration using the entrant’s verified Buffer email         | Owner completed registration on November 8; official thank-you page and unlocked submission form observed                                                                                                                                                      |
| Age, geography, team identity and third-party rights           | Must be confirmed by the entrant; not inferred from machine location or account names                                                                                                                                                                          |
| New functionality built during October 28–November 13          | November 8 reports, guidance, production configuration, deployment, read-receipt summaries and scoped real draft repair recorded in [build-log.md](build-log.md). October 25 work stays identified as pre-window; only new elements are considered for a prize |
| Publicly hosted, connectable OAuth application                 | [Stable HTTPS app](https://changeboard.52.202.25.181.sslip.io) and ordinary deployed OAuth verified; encrypted connection and selected organization survived an application restart                                                                            |
| Successful live API use and end-to-end functioning product     | Ordinary OAuth/reads and one scoped real text-draft repair passed. The application re-fetched, edited and verified Garden Studio; Buffer UI and post-restart readback agreed. No scheduling or publishing was tested                                           |
| Video no longer than two minutes showing the live API journey  | [114-second captioned demo](https://changeboard.52.202.25.181.sslip.io/demo.html): edited captures of a further real draft repair; no audio                                                                                                                    |
| Approximately 300-word problem/audience/API/next-steps summary | [306-word overview](../outputs/submission-overview.md) describes the live repair, scoped API use and separate sample                                                                                                                                           |
| API app client ID and entrant/team details                     | Supply through the official form; do not publish secrets, legal-name/email details or account screenshots in source                                                                                                                                            |
| Remain online through judging                                  | Durable VM deployment verified. Keep the VM/proxy/database online; no future uptime guarantee or external monitoring is claimed                                                                                                                                |

## Remaining validation

The [114-second captioned demo](https://changeboard.52.202.25.181.sslip.io/demo.html) shows Garden Studio → River Studio on the same validated unpublished draft. It is an edited walkthrough assembled from real browser captures, with timing/cursor overlays disclosed and no audio. A further real app repair succeeded in one attempt, followed by fresh Buffer UI/server readback. [Video evidence](../outputs/demo-video-evidence.json) · [Repair evidence](../outputs/recording-repair-evidence.json). The earlier River → Garden proof remains a separate dated checkpoint. Buffer decides whether the demonstration satisfies its requirements.

LIVE-02 passed for the original caption repair and a later recorded follow-up on **the same authorized test draft**. The installed scope permits caption edits only on that draft/channel. Other drafts, scheduled posts, images, correction creation, new fixtures/channels, publishing and expanded permissions remain outside it. No live conflict or uncertain-response path was induced in this run. One ordinary account is sufficient for the current deployment proof; second-account testing is optional future robustness work.

User testing was skipped for this submission at the owner's request. No participant findings, demand or measured savings are claimed. The same-host isolated restoration check passed; off-host disaster recovery and live refresh/revocation remain unverified.

## Evidence boundary

On November 8, the six-suite automated run passed **84 tests**, including four new report behavior tests and an HTTP/SQL download/isolation/no-mutation test. Strict TypeScript and the production build passed. Chromium browser checks for this revision used an isolated PGlite workspace with no live connection: desktop 1440×1000 and mobile 375×812; six manual phrase confirmations; changed poster inspected before acknowledgement; relative reminder recomputation; separately simulated source conflict; Enter applied exactly one post, two skipped outcomes persisted after reload; preview and result report downloads; second-change preview from River Studio to Garden Studio with a fresh image-review requirement; settings opened by Enter and closed by Escape; six Tab targets had solid 3px focus outlines. Mobile review/results/repeat widths matched the 375px viewport with reduced motion enabled. The unconfigured entry no longer navigated to the raw OAuth configuration error. This is a targeted walkthrough, not organizer research, screen-reader testing or a full accessibility audit. The [October verification](verification.md) remains historical evidence; no live provider write has been added by these tests.

### Earlier hosted checkpoint — November 8, 07:28 UTC

Runtime `5151595` passed a clean-clone install, typecheck, 86 tests and production build. The public PostgreSQL-backed sample completed a venue-only repair, reviewed poster, simulated conflict, one verified fictional update and two skips. HTTPS app/privacy/health/media checks, 375px responsive/reduced-motion checks and sample restart persistence passed. Ordinary OAuth then completed at the stable URL; the encrypted connection survived its own restart and fresh account/channel reads succeeded. [Deployment evidence](../outputs/deployment-evidence.json) and [OAuth evidence](../outputs/deployed-oauth-evidence.json) are separate from the earlier local review and October live receipts. No live mutation, registration, recording or submission occurred.

### Real repair added November 8, 08:33 UTC

Runtime `952cae5` imported a real fictional-content Buffer draft and applied River Studio → Garden Studio through the ordinary connected UI. One operation succeeded with one attempt; no post was skipped or uncertain in that real run. Buffer independently showed one unscheduled draft and zero queued/sent posts. The verified result and encrypted connection survived an application restart, followed by a fresh provider read. Ten new scope tests brought the unchanged original suite plus additions to 96 passing tests; clean-clone install/types/build also passed. [Real repair receipt](../outputs/live-draft-repair-evidence.json), [saved report](../outputs/live-draft-repair-report.md), [Buffer screenshot](images/buffer-draft-readback.jpg). Earlier 84/86-test and no-write observations above describe their earlier checkpoints. No registration, video recording, submission or Meta permission expansion occurred.

### Judge-access and recovery follow-through

The public static judge guide is linked from the app footer and README. It gives exact sample steps, separate real provider evidence and the one-draft live scope. The [submission handoff](../outputs/submission-preflight.md) records that the official submit page is registration-gated; no registration or submission was performed. [Restoration evidence](../outputs/backup-restore-evidence.json) covers all nine tables, schema/constraints/indexes, the restored live operation and encrypted-connection decryption with the preserved key. The isolated database had no network or published ports and was removed after checking. Production was not restored over, and no provider call or worker replay occurred. Same-host restoration does not establish off-host failover.

### Registration and demo completed later November 8

The owner completed registration and confirmed solo status; the official thank-you page and unlocked form were observed. The prepared form contains the owner-provided legal identity privately, public app/video URLs, client ID, 306-word summary, existing-project/build-window disclosure and no invented build-in-public trail. It is paused at the required terms question, without acceptance or final submission. [Current progress](../outputs/submission-progress-evidence.json). Earlier registration-gated and no-video observations above are dated snapshots.

### Submission received

On November 8, after the owner explicitly accepted the official terms and authorized the final submission, the prepared form was submitted once. The official `/api/commit/submitted` page confirmed receipt. The owner also confirmed GitHub himanshu748 for public credit. Legal identity, email and client ID remain out of the public evidence. [Confirmation](../outputs/submission-confirmation-evidence.json). The pending-terms notes above describe the earlier checkpoint; Buffer still determines eligibility and judging outcomes.

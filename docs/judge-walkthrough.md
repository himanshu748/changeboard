# Changeboard: user and judge walkthrough

Reviewed 8 November 2026 against the [Buffer Commit brief](https://buffer.com/api/commit) and [official terms](https://buffer.com/api/commit/terms), last updated October 13. This is a hosted product review and evidence map, not a submission or a prediction of judging results. Official pages were rechecked on November 8.

## The user and the useful task

A workshop organizer has already scheduled several differently worded announcements. The venue or date changes. They need to find the references, preserve unrelated copy, check images and reminder times, and know which posts still need attention.

The intended advantage over editing each post manually is reusable, exact associations between event facts and caption phrases, followed by a complete per-post review and an explicit outcome. The new downloadable report supports handing unresolved work to another organizer. User demand, time saved and willingness to pay are hypotheses; no organizer study has been completed.

## Try the hosted journey

Open [Changeboard](https://changeboard.52.202.25.181.sslip.io) logged out. No account is needed for this fictional sample, and it never calls Buffer. For local development, run `npm ci` and `npm run dev`, then open `http://127.0.0.1:4310`.

1. **Try the sample campaign.** Select the three scheduled posts; optionally include the published announcement. Continue to Review facts.
2. **Confirm current facts** without changing the original Saturday / Mill Studio details. Review the six exact phrases and confirm those that refer to the event. The sample deliberately requires your decisions.
3. Change only **Venue name** to **River Studio**, leaving November 21 and 18:00 unchanged. Preview changes. Compare full captions; unrelated writing stays intact. The separate example-change button changes multiple facts and is not used for this venue-only demonstration.
4. On the first post, **Use updated event poster**. Inspect the preview before acknowledging its event details. The second image still needs a separate review. Changing the venue alone leaves relative date wording unchanged.
5. To examine conflict behavior, expand **Test an external edit** on the third post, simulate the edit and refresh. This changes a separately persisted fictional source, not a Buffer post.
6. Select only the first ready post and **Simulate updates to 1 post**. The sample should record one verified update and two skipped posts. Skipping does not pause the remaining schedules.
7. **Download repair report.** Before applying, it labels proposals as unapplied; after applying, it distinguishes verified, skipped, failed and uncertain outcomes. It contains campaign content, so review it before sharing. It is a saved-state record, not a fresh provider check or tamper-proof certificate.
8. **Make another change**, then **Try another venue**. Confirmed phrases are reused; images must be reviewed again. Unresolved posts retain their own source baselines.

The hosted sample does not demonstrate live API repair. Separately, ordinary deployed OAuth, Page discovery, empty import and post-restart reads passed; open **Workspace settings** in the connected browser to inspect the six real read receipts. Neither boundary is a claim about an eligible final video. Do not hide the Sample workspace label in a recording.

## What the judges can assess

The three official criteria are equally weighted. Each judge scores each criterion from 1–5. No score is estimated here.

| Criterion                       | Product evidence                                                                                                                        | What remains unproven                                                                                                                                  |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Real usefulness                 | Specific event-change task; complete caption comparisons; media/schedule checks; retained unresolved work; downloadable handoff         | Observe organizers using their own workflow and compare repair effort with manual editing                                                              |
| Technical execution and craft   | Exact-span repair, durable operation records, pre-write conflict checks, verified outcomes, isolated downloads and honest sample states | Nonempty live import and repair, refresh/revocation, independent-account robustness, Buffer fetching public media, load and backup restoration         |
| Creativity and originality      | Reusable fact-to-phrase associations and explicit treatment of captions, schedules, images and partial repair                           | No exhaustive novelty claim. Most of this mechanism predates the build window; only the November additions are candidates for judging                  |
| Delight Award, optional         | Coherent responsive review flow, focused guidance and explicit next actions                                                             | Selection is at Buffer’s discretion; no award or competitive advantage is asserted                                                                     |
| Build-in-Public Award, optional | A public source repository exists                                                                                                       | The optional award requires up to five qualifying public social posts. A GitHub repository alone is not that trail; none were published in this review |

## Eligibility and submission gates

The deadline is **13 November 2026, 11:59 p.m. Pacific**, equivalent to **14 November, 1:29 p.m. IST**. Judging is approximately November 16–20; the app must remain live through judging. Buffer is the timekeeper. Recheck the official pages before submitting.

| Required item                                                  | Evidence and status                                                                                                                                                                                                                  |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Registration using the entrant’s verified Buffer email         | Not verified in this review; source publication does not register the entrant                                                                                                                                                        |
| Age, geography, team identity and third-party rights           | Must be confirmed by the entrant; not inferred from machine location or account names                                                                                                                                                |
| New functionality built during October 28–November 13          | November 8 reports, guidance, production configuration, deployment and read-receipt summaries recorded in [build-log.md](build-log.md). October 25 work stays identified as pre-window; only new elements are considered for a prize |
| Publicly hosted, connectable OAuth application                 | [Stable HTTPS app](https://changeboard.52.202.25.181.sslip.io) and ordinary deployed OAuth verified; encrypted connection and selected organization survived an application restart                                                  |
| Successful live API use and end-to-end functioning product     | Six fresh November HTTP 200 read receipts: ordinary OAuth/account, owned Page discovery and empty import; fresh reads passed after restart. Live repairs blocked - write authorization not granted                                   |
| Video no longer than two minutes showing the live API journey  | Missing. [Demo script](../outputs/demo-script.md) is a rehearsal plan, not a recorded live video                                                                                                                                     |
| Approximately 300-word problem/audience/API/next-steps summary | [Current overview](../outputs/submission-overview.md) describes verified hosting/reads and clearly labeled sample operations                                                                                                         |
| API app client ID and entrant/team details                     | Supply through the official form; do not publish secrets, legal-name/email details or account screenshots in source                                                                                                                  |
| Remain online through judging                                  | Durable VM deployment verified. Keep the VM/proxy/database online; no future uptime guarantee or external monitoring is claimed                                                                                                      |

## Remaining validation

The owner records the [110-second current-state script](../outputs/demo-script.md), verifies entrant details, registers and submits. The script shows a simulated repair and separately identifies the six new real read receipts; it does not claim a live write. Buffer decides whether a submitted demonstration satisfies its requirements.

LIVE-02 is **blocked - write authorization not granted**. Do not create fixtures, expand Meta permissions, connect new channels or fabricate live format evidence. Any future real repair requires separate authorization and actual provider readback. One ordinary account is sufficient for the current deployment proof; second-account testing is optional future robustness work.

A three-organizer study remains a useful internal product target, not an official contest requirement. Observe task completion, mistakes, unresolved-work interpretation and manual effort; do not invent savings. Backup restoration and live refresh/revocation also remain unverified.

## Evidence boundary

On November 8, the six-suite automated run passed **84 tests**, including four new report behavior tests and an HTTP/SQL download/isolation/no-mutation test. Strict TypeScript and the production build passed. Chromium browser checks for this revision used an isolated PGlite workspace with no live connection: desktop 1440×1000 and mobile 375×812; six manual phrase confirmations; changed poster inspected before acknowledgement; relative reminder recomputation; separately simulated source conflict; Enter applied exactly one post, two skipped outcomes persisted after reload; preview and result report downloads; second-change preview from River Studio to Garden Studio with a fresh image-review requirement; settings opened by Enter and closed by Escape; six Tab targets had solid 3px focus outlines. Mobile review/results/repeat widths matched the 375px viewport with reduced motion enabled. The unconfigured entry no longer navigated to the raw OAuth configuration error. This is a targeted walkthrough, not organizer research, screen-reader testing or a full accessibility audit. The [October verification](verification.md) remains historical evidence; no live provider write has been added by these tests.

### Hosted evidence added November 8

Runtime `5151595` passed a clean-clone install, typecheck, 86 tests and production build. The public PostgreSQL-backed sample completed a venue-only repair, reviewed poster, simulated conflict, one verified fictional update and two skips. HTTPS app/privacy/health/media checks, 375px responsive/reduced-motion checks and sample restart persistence passed. Ordinary OAuth then completed at the stable URL; the encrypted connection survived its own restart and fresh account/channel reads succeeded. [Deployment evidence](../outputs/deployment-evidence.json) and [OAuth evidence](../outputs/deployed-oauth-evidence.json) are separate from the earlier local review and October live receipts. No live mutation, registration, recording or submission occurred.

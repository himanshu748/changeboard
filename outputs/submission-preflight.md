# Changeboard — submission handoff

Checked 8 November 2026. The official signed-in submit page displayed **Register first** for the existing Buffer account. No registration or submission was performed. The submission form's dynamic fields and limits remain inaccessible until registration is complete. [Preflight evidence](submission-preflight-evidence.json).

## Ready to use

| Item              | Prepared value or artifact                                                                                                                                   |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Project name      | Changeboard                                                                                                                                                  |
| Promise           | Change one event fact. Repair the campaign you already wrote.                                                                                                |
| Public app        | https://changeboard.52.202.25.181.sslip.io                                                                                                                   |
| Judge guide       | https://changeboard.52.202.25.181.sslip.io/judge.html                                                                                                        |
| Source            | https://github.com/himanshu748/changeboard                                                                                                                   |
| Write-up          | [369-word overview](submission-overview.md): problem, audience, API use, evidence boundaries and next steps                                                  |
| Video plan        | [110-second real-draft script](demo-script.md); no video has been recorded or uploaded                                                                       |
| Real API proof    | [One live draft repair](live-draft-repair-evidence.json), [report](live-draft-repair-report.md), [Buffer readback](../docs/images/buffer-draft-readback.jpg) |
| Build-window work | [Dated build log](../docs/build-log.md); October work stays pre-window                                                                                       |
| Recovery proof    | [Isolated PostgreSQL restoration](backup-restore-evidence.json); same-host test, no failover claim                                                           |

The existing app client ID is prepared in the local **private** handoff file outside this repository. Supply the client ID through the official form. Never paste the client secret, access/refresh tokens, database password or encryption key. No secret is needed in the written summary or video.

## Entrant-owned steps

1. [Register](https://buffer.com/api/commit/register) using the existing verified Buffer account. Supply the entrant's full legal name, confirmed solo/team details and other requested information; these were not inferred from GitHub or profile names. Read and accept any required terms yourself.
2. Record the real-draft script. It describes a further caption edit on the same authorized fixture; that next recording mutation has not been executed by the script. Keep it unpublished and unscheduled, show actual completion and Buffer readback, and verify the exported duration is at most two minutes.
3. Upload the video to an accessible destination and check the final video URL from a logged-out browser. No destination or video URL has been fabricated.
4. Open [the official submission form](https://buffer.com/api/commit/submit) after registration is recognized. Paste the prepared app URL, summary and app client ID; provide the video URL and requested entrant/team/credit details. Check the actual field limits then, because the form is currently registration-gated.
5. Explicitly identify the November additions. State that the sample is simulated and the live evidence is a caption repair on one real unpublished test draft. The private receipt does not allow judges to repair unrelated posts.
6. Submit yourself and retain the actual confirmation. Keep the existing VM, database, proxy, static IP and hostname available throughout judging; current health checks are point-in-time observations, not a future uptime guarantee.

Deadline: **13 November 2026, 11:59 p.m. Pacific / 14 November, 1:29 p.m. IST**. Judging is approximately November 16–20 under the [official terms](https://buffer.com/api/commit/terms); recheck before submitting. Registration, legal eligibility, video and final submission remain the entrant's responsibility under the existing instructions.

## Deliberate scope

User testing was skipped for this submission at the owner's request. No research participants, organizer feedback, usage, willingness to pay or time savings are claimed. A second account, broader live writes, scheduled publishing, images and correction creation remain unverified. The optional build-in-public award is not being pursued through unsolicited social posts.

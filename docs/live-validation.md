# Live validation gates

Live acceptance requires actual provider evidence. **The November 8 draft-only test passed:** one fictional Facebook text draft was created, a controlled smoke edit was read back, and one separate repair ran through the deployed app with pre-write checks and verified readback. [Receipt](../outputs/live-draft-repair-evidence.json). The initial read-only checkpoint and broader test plan below remain historical or unexecuted where labeled.

Current prerequisites are the existing ordinary OAuth account, exact registered HTTPS callback, encrypted server credentials, PostgreSQL and the already owned Page. A second account is optional robustness testing, not required for this sprint. No new account, channel, OAuth scope or Meta permission was added.

Use future dated, clearly fictional fixtures and record IDs/timestamps, with credentials removed. Obtain authorization for creating/editing the actual test posts before any live mutation. Keep sample content separate.

1. OAuth fresh ordinary account: consent, callback, account read, explicit organization selection. Repeat with the second account and verify resource isolation.
2. Read existing draft and scheduled posts, paginate, compare full caption/assets/timezones/status/actions with Buffer UI. Verify unsupported formats remain unavailable.
3. Confirm exact source associations. Narrow caption edit on owned post, re-fetch; prove assets, tags, metadata, approval policy and publication time preserved.
4. Relative phrase with fixed publication context; keep time and preserve confirmed offset. Verify actual custom schedule and timezone.
5. Review and replace a stale single image with a revision-unique public PNG. Verify new alt text and positional tags are appropriate.
6. Edit a test post directly in Buffer after preview; application must withhold the mutation and show current/imported/proposed text. Test sending/sent and cutoff without racing real publication.
7. Apply selected posts with one withheld; persist individual outcomes after reload. No batch atomicity claim.
8. Create a separately reviewed correction draft on the approved destination. Verify draft ID, text and status; verify original public announcement unchanged.
9. Second fact change must reuse associations from observed successful snapshots.
10. Refresh/revoke grant and confirm reconnect states. Never deliberately expose tokens to test logs.

Store a redacted receipt for each observed format. `LIVE_FORMAT_EVIDENCE_FILE` is a release gate, not a substitute for these tests. Initial smoke writes must be conducted through a dedicated authorized validation harness after reviewing exact payloads, then the application can enable the verified format. Default installations have no enabled live write formats. The current host mounts only the restricted receipt described below.

Record attempted failure as failure, not success. For unknown create outcomes, inspect Buffer and reconcile; never blindly retry.

## Earlier two-draft proposal — not executed as written

This was prepared under the earlier read-only authorization and was not executed as written. The later approval and actual one-draft test below supersede this proposal. Use only the already owned test Page, after checking its current permissions. Create two **drafts**, with no publication time and no scheduling/publishing action:

1. `Changeboard test only — Fictional workshop, 21 November 2026, 6 p.m., Mill Studio. Do not publish.`
2. `Changeboard test only — Reminder for the fictional workshop at Mill Studio. Do not publish.`

The reviewed repair changes only `Mill Studio` to `River Studio`. Verify a narrow edit on the first disposable fixture against the provider, then record its real text-format proof before enabling that format for the app. Import and repair through the ordinary user journey; use the second disposable fixture for a separately reviewed external-caption-change/conflict check. Read back both drafts, confirm that neither was scheduled or published, and download the recorded-outcome report. Do not delete fixtures or broaden the Page grant without authorization. If provider permissions or schema prevent the operation, stop that write and report the exact gap; do not invent evidence or enable a gate from a simulation.

## Historical read-only checkpoint — 8 November, 07:28 UTC

LIVE-02 is **blocked — write authorization not granted**. The owner explicitly retained read-only live testing as the default for this sprint. The fixture proposal above was not executed, and no additional Meta grant or channel was requested. No live format is enabled. Ordinary deployed OAuth passed using the existing signed-in in-app browser. The existing callback/privacy URLs were updated without changing scopes. Six fresh read receipts and encrypted-connection/organization persistence across restart are recorded in [deployed OAuth evidence](../outputs/deployed-oauth-evidence.json); one account is sufficient for this sprint. Independent-account testing is a future robustness exercise, not a gate being pursued here.

## Current authorization and executed test — 8 November 2026

The owner authorized the specifically proposed **draft-only** test on the existing Page: one fictional draft, controlled validation, then one repair through the deployed app. Scheduling, publishing, deletion and permission expansion were excluded. No Meta permission was expanded; Buffer allowed the draft operations under the existing grant.

The fixture was `Changeboard test only — Fictional workshop at Mill Studio. Do not publish.` Buffer initially rejected creation and editing without explicit Facebook `type: post`; both failures are recorded as rejected requests, not successes. Corrected creation used `saveToDraft: true` and no publication time. The smoke edit changed Mill Studio to River Studio and verified the draft and unrelated fields by fresh read. The production adapter now also sends the required type and explicitly retains draft status when editing a Facebook draft.

The deployed app then imported that real draft, confirmed its exact River Studio association, previewed Garden Studio and applied exactly one selected repair. Its worker kept the existing pre-write fingerprint, ownership, lease and uncertainty controls; the single attempt succeeded and was read back. Buffer UI showed Garden Studio, one unscheduled draft, zero queued and zero sent posts. Restarting only Changeboard retained the operation and encrypted connection; a fresh post read and browser reload passed.

LIVE-02 is **verified for this one Facebook text draft**, backed by [the application receipt](../outputs/live-draft-repair-evidence.json) and [separate provider smoke receipt](../outputs/live-draft-smoke-evidence.json). No other live format is enabled.

The installed private `LiveFormatEvidence` includes a validated scope:

```json
{
  "key": "facebook:page:text",
  "verifiedAt": "<actual verified readback timestamp>",
  "receiptId": "<actual captured provider-test receipt>",
  "scope": {
    "draftTextEditsOnly": true,
    "channelId": "<the approved channel ID>",
    "postIds": ["<the approved test draft ID>"]
  }
}
```

These are documentation placeholders, not enablement evidence. The actual file is private, outside the checkout, and mounted read-only. Both preview and adapter enforce the scope; malformed restrictions are rejected rather than ignored. Other post IDs, channels, scheduled posts, image replacements, rescheduling, moving-to-draft and correction creation cannot use this receipt. Only further caption edits to the existing test draft can be explicitly approved in the app, including an entrant-recorded rehearsal. The agent performed one application repair and left the draft at Garden Studio. No further recording operation is claimed.

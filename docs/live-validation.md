# Live validation gates

No live acceptance gate is satisfied by deterministic tests, adapter fixtures or the sample campaign. Current evidence: first-account OAuth, organization/channel reads and restart persistence passed through temporary HTTPS. The owned Himanshu jha Facebook Page is connected with an explicitly approved read-only Meta grant. A bounded post read returned zero rows and no next page, matching Buffer UI counts. Nonempty post/pagination, second-account and mutation gates remain NOT RUN. The current user instruction permits read-only testing only.

Required inputs: signed-in Buffer account; registered server OAuth app client ID/secret; exact HTTPS callback; application encryption key; an authorized public deployment with durable PostgreSQL/media; at least one owned supported Facebook Page or Instagram professional channel; a second ordinary Buffer account with its own permitted resources.

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

Store a redacted receipt for each observed format. `LIVE_FORMAT_EVIDENCE_FILE` is a release gate, not a substitute for these tests. Initial smoke writes must be conducted through a dedicated authorized validation harness after reviewing exact payloads, then the application can enable the verified format. Current app defaults to no live write formats.

Record attempted failure as failure, not success. For unknown create outcomes, inspect Buffer and reconcile; never blindly retry.

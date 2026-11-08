import type { Campaign, Operation, Snapshot } from "../shared";

// Captions are untrusted text. A longer fence prevents them from adding Markdown
// links, HTML or headings to the downloaded report.
function literal(text: string) {
  const longest = Math.max(
    0,
    ...[...text.matchAll(/`+/g)].map((m) => m[0].length),
  );
  const fence = "`".repeat(Math.max(3, longest + 1));
  return `${fence}text\n${text}\n${fence}`;
}

function schedule(post: Snapshot) {
  if (!post.scheduledAt)
    return post.mode === "queue"
      ? "Floating queue slot; no fixed publication time."
      : "Draft; no publication time.";
  try {
    const local = new Intl.DateTimeFormat("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: post.channelTimezone,
    }).format(new Date(post.scheduledAt));
    return `${local} · ${post.channelTimezone}\nInstant: ${post.scheduledAt}`;
  } catch {
    return `${post.scheduledAt} · unrecognized channel timezone; check in Buffer.`;
  }
}

function outcome(op: Operation, sample: boolean) {
  const labels: Record<Operation["status"], string> = {
    succeeded: sample ? "Verified in sample" : "Updated and verified",
    skipped: "Skipped; unchanged by this operation",
    uncertain: "Outcome uncertain; check before retrying",
    needs_review: "Needs review; repair withheld",
    failed: "Failed; review before trying again",
    pending: "Waiting; no verified outcome yet",
    running: "In progress; no verified outcome yet",
  };
  return labels[op.status];
}

/** A read-only handoff from persisted state, never a fresh provider observation. */
export function repairReceipt(
  c: Campaign,
  generatedAt = new Date().toISOString(),
) {
  const lines = [
    "# Changeboard repair report",
    "",
    literal(c.name),
    `Generated: ${generatedAt} · revision ${c.revision}`,
    "",
    c.mode === "sample"
      ? "SAMPLE — fictional campaign and simulated outcomes. No Buffer posts changed."
      : "LIVE ACCOUNT — recorded application state, not a fresh check of Buffer. Other edits or publication may have happened since the recorded checks.",
    "",
    "This download contains campaign captions and event details. Review it before sharing. Connection credentials, account IDs and media URLs are not part of this report.",
    "",
    "## Event plan",
    "Original event details:",
    literal(
      `${c.originalFacts.date} ${c.originalFacts.time} · ${c.originalFacts.timezone}\n${c.originalFacts.venue}\n${c.originalFacts.address}`,
    ),
    "Current target details:",
    literal(
      `${c.proposedFacts.date} ${c.proposedFacts.time} · ${c.proposedFacts.timezone}\n${c.proposedFacts.venue}\n${c.proposedFacts.address}`,
    ),
    "",
    "## Current review",
  ];
  if (c.changeSet && !c.changeSet.applied) {
    lines.push("PROPOSALS ONLY — this preview has not been applied.");
    for (const [i, p] of c.changeSet.proposals.entries()) {
      lines.push(
        "",
        `### Review post ${i + 1}`,
        "Channel:",
        literal(`${p.before.channelName} · ${p.before.service}`),
        p.eligible
          ? p.selected
            ? "Ready; selected for approval."
            : "Ready; not selected."
          : "Blocked; needs review.",
        "Source caption:",
        literal(p.before.text),
        "Proposed caption (not applied):",
        literal(p.after.text),
        "Source publication:",
        literal(schedule(p.before)),
        "Proposed publication:",
        literal(schedule(p.after)),
        p.before.assets.length
          ? "Attached image: separate review is required for each revision."
          : "No attached image.",
        ...p.issues.map((issue) => literal(issue.message)),
      );
    }
  } else {
    lines.push(
      "No unapplied preview is available. Recorded outcomes below describe individual operations, not completion of the entire campaign.",
    );
  }

  lines.push(
    "",
    "## Latest recorded outcomes",
    "These records may predate the current target plan. Compare each caption and check time; a successful earlier repair does not verify a later plan.",
  );
  const latest = new Map<string, Operation>();
  for (const op of [...c.operations].sort(
    (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt),
  ))
    latest.set(
      `${op.action === "correction" ? "correction" : "post"}:${op.postId}`,
      op,
    );
  if (!latest.size) lines.push("No operations have been applied.");
  for (const [i, op] of [...latest.values()].entries()) {
    lines.push(
      "",
      `### Outcome ${i + 1} — ${op.action === "correction" ? "separate correction draft" : op.action === "move_to_draft" ? "move to Draft" : "post repair"}`,
      outcome(op, c.mode === "sample"),
      `Last recorded check: ${op.updatedAt}`,
      "Channel:",
      literal(`${op.before.channelName} · ${op.before.service}`),
      literal(op.message),
      "Source caption:",
      literal(op.before.text),
      op.status === "succeeded"
        ? "Verified caption at that check:"
        : "Proposed caption (not a verified result):",
      literal(op.after.text),
      "Source publication:",
      literal(schedule(op.before)),
      op.status === "succeeded"
        ? "Verified publication at that check:"
        : "Proposed publication (not verified):",
      literal(schedule(op.after)),
    );
    if (op.status === "skipped" && op.before.scheduledAt)
      lines.push(
        "ATTENTION: skipping does not stop publication. The existing post remains scheduled unless it is separately changed in Buffer.",
      );
    if (op.status === "uncertain")
      lines.push(
        "ATTENTION: this operation may have succeeded. Use Check outcome before considering a new attempt; do not blindly retry.",
      );
    if (op.action === "correction")
      lines.push(
        "The original published announcement was not edited or deleted by this correction operation.",
      );
  }
  lines.push(
    "",
    "## Next check",
    "Review every blocked, skipped, failed or uncertain post. A changed caption does not prove its image is accurate. Check remaining schedules in Buffer; this report does not pause publication or authorize further changes.",
    "",
  );
  return lines.join("\n");
}

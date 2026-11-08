import { describe, expect, it } from "vitest";
import { repairReceipt } from "../src/server/receipt";
import { sampleCampaign } from "../src/server/sample";
import type { Operation } from "../src/shared";

function operation(status: Operation["status"]): Operation {
  const before = sampleCampaign("/media/private-image").availablePosts[0];
  return {
    id: "internal-operation-id",
    postId: before.id,
    changeSetId: "internal-set-id",
    action: "edit",
    status,
    message: "Stored outcome message.",
    before,
    after: { ...before, text: "Proposed repair at River Studio." },
    createdAt: "2026-11-08T01:00:00Z",
    updatedAt: "2026-11-08T01:01:00Z",
    attempts: 1,
  };
}

describe("repair handoff accuracy", () => {
  it("does not turn uncertain or skipped operations into verified repairs", () => {
    const c = sampleCampaign("/media/private-image");
    c.operations = [operation("uncertain")];
    c.operations[0].before.channelTimezone = "Asia/Kolkata";
    const uncertain = repairReceipt(c);
    expect(uncertain).toContain("19 Nov 2026, 15:30 · Asia/Kolkata");
    expect(uncertain).toContain("Outcome uncertain; check before retrying");
    expect(uncertain).toContain("Proposed caption (not a verified result)");
    expect(uncertain).not.toContain("Verified caption at that check");
    c.operations = [operation("skipped")];
    expect(repairReceipt(c)).toContain("skipping does not stop publication");
  });

  it("reports the newest outcome and labels sample evidence without leaking internal fields", () => {
    const c = sampleCampaign("/media/private-image");
    c.operations = [
      operation("uncertain"),
      { ...operation("succeeded"), createdAt: "2026-11-08T02:00:00Z" },
    ];
    const text = repairReceipt(c);
    expect(text).toContain("SAMPLE — fictional campaign");
    expect(text).toContain("Verified in sample");
    expect(text).not.toContain("Outcome uncertain;");
    for (const privateValue of [
      "internal-operation-id",
      "internal-set-id",
      "/media/private-image",
      "sample-facebook",
    ])
      expect(text).not.toContain(privateValue);
    expect(text).toContain(
      "successful earlier repair does not verify a later plan",
    );
  });

  it("keeps caption Markdown and HTML inside a literal block", () => {
    const c = sampleCampaign("/media/private-image");
    const op = operation("succeeded");
    op.after.text =
      '```\n# Forged verification\n<a href="https://example.invalid">unsafe</a>';
    c.operations = [op];
    expect(repairReceipt(c)).toContain(
      '````text\n```\n# Forged verification\n<a href="https://example.invalid">unsafe</a>\n````',
    );
  });

  it("keeps a new unapplied preview separate from older successful outcomes", () => {
    const c = sampleCampaign("/media/private-image");
    c.mode = "live";
    c.operations = [operation("succeeded")];
    c.changeSet = {
      id: "new-preview",
      revision: 2,
      campaignVersion: 3,
      applied: false,
      createdAt: "2026-11-08T03:00:00Z",
      proposals: [
        {
          postId: "sample-1",
          before: c.operations[0].after,
          after: {
            ...c.operations[0].after,
            text: "New unapproved Garden Studio proposal.",
          },
          changes: [],
          issues: [],
          eligible: true,
          selected: false,
          media: { revision: 2, status: "needs_review", acknowledged: false },
          bindings: [],
          action: "edit",
        },
      ],
    };
    const text = repairReceipt(c);
    expect(text).toContain(
      "LIVE ACCOUNT — recorded application state, not a fresh check",
    );
    expect(text).toContain(
      "PROPOSALS ONLY — this preview has not been applied",
    );
    expect(text).toContain("Ready; not selected");
    expect(text).toContain("Proposed caption (not applied)");
  });
});

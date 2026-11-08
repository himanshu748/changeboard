import { describe, expect, it, vi } from "vitest";
import {
  BufferClient,
  liveFormatAllows,
  LiveFormatEvidenceSchema,
  type BufferPost,
  type LiveFormatEvidence,
  type NarrowPostEdit,
} from "../src/buffer";

const channel = {
  id: "fixture-channel",
  organizationId: "fixture-org",
  name: "Test Page",
  displayName: "Test Page",
  service: "facebook",
  type: "page",
  timezone: "Asia/Kolkata",
  allowedActions: ["manageUpdates", "readUpdates"],
  isDisconnected: false,
  isLocked: false,
  isQueuePaused: false,
};
const draft: BufferPost = {
  id: "fixture-draft",
  text: "Workshop at River Studio.",
  channelId: channel.id,
  channelService: "facebook",
  channel,
  status: "draft",
  dueAt: null,
  isCustomScheduled: false,
  shareMode: "addToQueue",
  schedulingType: "automatic",
  allowedActions: ["updatePost", "updatePostSchedule", "movePostToDraft"],
  assets: [],
  tags: [],
  metadata: {
    __typename: "FacebookPostMetadata",
    type: "post",
    annotations: [],
    firstComment: null,
    linkAttachment: null,
    title: null,
  },
  createdAt: "2026-11-08T08:00:00Z",
  updatedAt: "2026-11-08T08:00:00Z",
  sentAt: null,
};
const proof: LiveFormatEvidence = {
  key: "facebook:page:text",
  verifiedAt: "2026-11-08T08:00:00Z",
  receiptId: "SIMULATED-SCOPE-TEST-ONLY",
  scope: {
    draftTextEditsOnly: true,
    channelId: channel.id,
    postIds: [draft.id],
  },
};
const request = {
  key: proof.key,
  channelId: channel.id,
  postId: draft.id,
  operation: "edit" as const,
  status: "draft",
  captionOnly: true,
};

describe("Restricted live-format evidence (simulated transport only)", () => {
  it("requires a valid nonempty scope and receipt, without silently discarding a malformed restriction", () => {
    expect(LiveFormatEvidenceSchema.safeParse(proof).success).toBe(true);
    for (const scope of [
      { ...proof.scope, postIds: [] },
      { ...proof.scope, channelId: "" },
      { ...proof.scope, draftTextEditsOnly: false },
      { ...proof.scope, unexpected: true },
    ]) {
      expect(
        LiveFormatEvidenceSchema.safeParse({ ...proof, scope }).success,
      ).toBe(false);
      expect(
        liveFormatAllows({ ...proof, scope } as LiveFormatEvidence, request),
      ).toBe(false);
    }
    expect(liveFormatAllows({ ...proof, receiptId: "" }, request)).toBe(false);
    expect(
      liveFormatAllows({ ...proof, verifiedAt: "not-a-date" }, request),
    ).toBe(false);
  });

  it("matches only the verified draft, channel, format and caption-edit operation", () => {
    expect(liveFormatAllows(proof, request)).toBe(true);
    for (const change of [
      { postId: "another-draft" },
      { channelId: "another-channel" },
      { key: "facebook:page:single-image" },
      { status: "scheduled" },
      { operation: "create" as const },
      { captionOnly: false },
    ]) {
      expect(liveFormatAllows(proof, { ...request, ...change })).toBe(false);
    }
  });

  it.each<[string, Partial<BufferPost>, NarrowPostEdit]>([
    ["different draft", { id: "another-draft" }, { text: "New venue." }],
    [
      "different channel",
      {
        channelId: "another-channel",
        channel: { ...channel, id: "another-channel" },
      },
      { text: "New venue." },
    ],
    [
      "scheduled post",
      { status: "scheduled", dueAt: "2026-11-21T12:00:00Z" },
      { text: "New venue." },
    ],
    [
      "rescheduling",
      {},
      { text: "New venue.", fixedScheduledAt: "2026-11-21T12:00:00Z" },
    ],
    ["move to draft", {}, { moveToDraft: true }],
    [
      "replacement image",
      {},
      {
        text: "New venue.",
        replacementImage: {
          url: "https://example.com/image.png",
          altText: "Test image",
        },
      },
    ],
  ])("rejects %s before any provider request", async (_label, change, edit) => {
    const fetcher = vi.fn<typeof fetch>();
    const client = new BufferClient({
      accessToken: "SIMULATED-ONLY",
      fetch: fetcher,
      verifiedFormats: [proof],
    });
    await expect(
      client.editPost({ ...draft, ...change }, edit),
    ).rejects.toMatchObject({ kind: "unsupported" });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("does not enable correction-draft creation from a caption-edit receipt", async () => {
    const fetcher = vi.fn<typeof fetch>();
    const client = new BufferClient({
      accessToken: "SIMULATED-ONLY",
      fetch: fetcher,
      verifiedFormats: [proof],
    });
    await expect(
      client.createCorrectionDraft(channel, { text: "Correction." }),
    ).rejects.toMatchObject({ kind: "unsupported" });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("allows the reviewed draft caption edit with explicit draft status and Facebook type in the mutation", async () => {
    const updated = { ...draft, text: "Workshop at Garden Studio." };
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            editPost: { __typename: "PostActionSuccess", post: updated },
          },
        }),
        { status: 200 },
      ),
    );
    const client = new BufferClient({
      accessToken: "SIMULATED-ONLY",
      fetch: fetcher,
      verifiedFormats: [proof],
    });
    expect((await client.editPost(draft, { text: updated.text })).text).toBe(
      updated.text,
    );
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(
      JSON.parse(String(fetcher.mock.calls[0][1]?.body)).variables.input,
    ).toEqual({
      id: draft.id,
      text: updated.text,
      metadata: { facebook: { type: "post" } },
      saveToDraft: true,
    });
  });
});

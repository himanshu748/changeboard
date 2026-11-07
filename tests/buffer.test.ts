import { describe, expect, it, vi } from "vitest";
import { createHash, randomBytes } from "node:crypto";
import {
  BufferClient,
  BufferApiError,
  createOAuthAttempt,
  validateOAuthCallback,
  exchangeCode,
  refreshTokens,
  encryptTokens,
  decryptTokens,
  narrowEditInput,
  unsupportedReason,
  type BufferPost,
  type BufferChannel,
  type ApiReceipt,
} from "../src/buffer";

const channel: BufferChannel = {
  id: "channel-1",
  organizationId: "org-1",
  name: "Clay studio",
  displayName: "Clay Studio",
  service: "facebook",
  type: "page",
  timezone: "Europe/London",
  allowedActions: ["manageUpdates", "readUpdates"],
  isDisconnected: false,
  isLocked: false,
  isQueuePaused: false,
};
const post: BufferPost = {
  id: "post-1",
  text: "Meet us at Mill Studio.",
  channelId: channel.id,
  channelService: channel.service,
  channel,
  status: "scheduled",
  dueAt: "2026-11-20T12:00:00Z",
  isCustomScheduled: true,
  shareMode: "customScheduled",
  schedulingType: "automatic",
  allowedActions: ["updatePost", "updatePostSchedule", "movePostToDraft"],
  assets: [],
  metadata: {
    __typename: "FacebookPostMetadata",
    type: "post",
    annotations: [],
    firstComment: "Keep this.",
    linkAttachment: null,
    title: null,
  },
  tags: [{ id: "tag-1", name: "Workshop", color: "#0F766E" }],
  updatedAt: "2026-10-25T10:00:00Z",
  createdAt: "2026-10-24T10:00:00Z",
  sentAt: null,
};
const verifiedFormats = [
  {
    key: "facebook:page:text",
    verifiedAt: "2026-10-25T10:00:00Z",
    receiptId: "SIMULATED-TEST-ONLY",
  },
];
const config = {
  clientId: "test-client",
  clientSecret: "test-secret",
  redirectUri: "https://changeboard.example/auth/callback",
};
const tokenResponse = {
  access_token: "test-access",
  refresh_token: "test-refresh",
  token_type: "Bearer",
  expires_in: 3600,
  scope: "account:read posts:read posts:write offline_access",
};
function response(value: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(value), { status: 200, ...init });
}
function fetchMock(...values: (Response | Error)[]) {
  return vi.fn<typeof fetch>().mockImplementation(async () => {
    const value = values.shift();
    if (value instanceof Error) throw value;
    if (!value) throw new Error("Unexpected extra request");
    return value;
  });
}
function body(mock: ReturnType<typeof fetchMock>, index = 0) {
  return JSON.parse(String(mock.mock.calls[index][1]?.body));
}

describe("Buffer OAuth (simulated transport)", () => {
  it("uses fresh PKCE/state, exact HTTPS callback, and only the four required scopes", () => {
    const first = createOAuthAttempt(config, 1000);
    const second = createOAuthAttempt(config, 1000);
    const url = new URL(first.url);
    expect(url.origin + url.pathname).toBe("https://auth.buffer.com/auth");
    expect(url.searchParams.get("code_challenge")).toBe(
      createHash("sha256").update(first.verifier).digest("base64url"),
    );
    expect(url.searchParams.get("redirect_uri")).toBe(config.redirectUri);
    expect(url.searchParams.get("scope")?.split(" ")).toEqual([
      "account:read",
      "posts:read",
      "posts:write",
      "offline_access",
    ]);
    expect(first.state).not.toBe(second.state);
    expect(first.verifier).not.toBe(second.verifier);
    expect(first.url).not.toContain("test-secret");
    expect(() =>
      createOAuthAttempt({
        ...config,
        redirectUri: "http://localhost/callback",
      }),
    ).toThrow(/HTTPS/);
  });

  it("refuses wrong, expired and denied callback states", () => {
    const attempt = createOAuthAttempt(config, 1000);
    expect(() =>
      validateOAuthCallback(attempt, { state: "wrong", code: "code" }, 1001),
    ).toThrow(/state/);
    expect(() =>
      validateOAuthCallback(
        attempt,
        { state: attempt.state, code: "code" },
        700_000,
      ),
    ).toThrow(/expired/);
    expect(() =>
      validateOAuthCallback(
        attempt,
        { state: attempt.state, error: "access_denied" },
        1001,
      ),
    ).toThrow(/denied/);
    expect(
      validateOAuthCallback(
        attempt,
        { state: attempt.state, code: "code" },
        1001,
      ),
    ).toBe("code");
  });

  it("exchanges authorization code with verifier and validates granted scopes", async () => {
    const fetcher = fetchMock(response(tokenResponse));
    const pair = await exchangeCode(
      config,
      "one-time-code",
      "verifier",
      fetcher,
      1000,
    );
    const payload = fetcher.mock.calls[0][1]?.body as URLSearchParams;
    expect(payload.get("code_verifier")).toBe("verifier");
    expect(payload.get("client_secret")).toBe("test-secret");
    expect(payload.get("redirect_uri")).toBe(config.redirectUri);
    expect(pair.expiresAt).toBe(3_601_000);
    expect(pair.refreshToken).toBe("test-refresh");
    const bad = fetchMock(response({ ...tokenResponse, scope: "posts:read" }));
    await expect(exchangeCode(config, "code", "verifier", bad)).rejects.toThrow(
      /required scopes/,
    );
  });

  it("omits client_secret for a public client and replaces the refresh token pair", async () => {
    const fetcher = fetchMock(
      response({
        ...tokenResponse,
        access_token: "new-access",
        refresh_token: "new-refresh",
      }),
    );
    const pair = await refreshTokens(
      { clientId: config.clientId, redirectUri: config.redirectUri },
      "old-refresh",
      fetcher,
      1000,
    );
    const payload = fetcher.mock.calls[0][1]?.body as URLSearchParams;
    expect(payload.has("client_secret")).toBe(false);
    expect(payload.get("refresh_token")).toBe("old-refresh");
    expect(pair.refreshToken).toBe("new-refresh");
    expect(pair.accessToken).toBe("new-access");
  });

  it("never retries a revoked or ambiguously consumed refresh token", async () => {
    const revoked = fetchMock(
      response({ error: "invalid_grant" }, { status: 400 }),
    );
    await expect(refreshTokens(config, "old", revoked)).rejects.toMatchObject({
      kind: "authentication",
      uncertain: false,
    });
    expect(revoked).toHaveBeenCalledTimes(1);
    const timeout = fetchMock(new Error("dropped response"));
    await expect(refreshTokens(config, "old", timeout)).rejects.toMatchObject({
      kind: "authentication",
      uncertain: true,
    });
    expect(timeout).toHaveBeenCalledTimes(1);
  });

  it("encrypts token pairs with authenticated per-connection context and randomized ciphertext", () => {
    const key = randomBytes(32).toString("base64");
    const pair = {
      accessToken: "never-log-this",
      refreshToken: "neither-this",
      expiresAt: 1,
      scopes: ["account:read"],
    };
    const one = encryptTokens(pair, key, "connection-1");
    const two = encryptTokens(pair, key, "connection-1");
    expect(one).not.toBe(two);
    expect(one).not.toContain(pair.accessToken);
    expect(decryptTokens(one, key, "connection-1")).toEqual(pair);
    expect(() => decryptTokens(one, key, "connection-2")).toThrow();
    expect(() => encryptTokens(pair, "short", "connection-1")).toThrow(/32/);
  });
});

describe("Buffer GraphQL adapter (simulated transport, not live evidence)", () => {
  it("caches discovery and refuses an unowned organization or cross-org channel before reads", async () => {
    const fetcher = fetchMock(
      response({
        data: {
          account: {
            id: "account-1",
            name: "Owner",
            organizations: [{ id: "org-1", name: "Studio" }],
          },
        },
      }),
    );
    const client = new BufferClient({ accessToken: "token", fetch: fetcher });
    await client.account();
    await client.account();
    await expect(client.channels("someone-elses-org")).rejects.toMatchObject({
      kind: "authentication",
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("filters bounded reads and passes the opaque cursor without adopting posts automatically", async () => {
    const fetcher = fetchMock(
      response({
        data: {
          account: {
            id: "account-1",
            name: "Owner",
            organizations: [{ id: "org-1", name: "Studio" }],
          },
        },
      }),
      response({ data: { channels: [channel] } }),
      response({
        data: {
          posts: {
            edges: [{ node: post }],
            pageInfo: { hasNextPage: true, endCursor: "next" },
          },
        },
      }),
    );
    const client = new BufferClient({ accessToken: "token", fetch: fetcher });
    const result = await client.listPosts({
      organizationId: "org-1",
      channelIds: ["channel-1"],
      statuses: ["scheduled"],
      first: 6,
      after: "opaque-cursor",
      startDate: "2026-11-01T00:00:00Z",
    });
    expect(result.posts[0].text).toBe(post.text);
    expect(body(fetcher, 2).variables).toEqual({
      input: {
        organizationId: "org-1",
        filter: {
          channelIds: ["channel-1"],
          status: ["scheduled"],
          startDate: "2026-11-01T00:00:00Z",
        },
      },
      first: 6,
      after: "opaque-cursor",
    });
    await expect(
      client.listPosts({
        organizationId: "org-1",
        channelIds: ["channel-1"],
        statuses: ["scheduled"],
        first: 1000,
      }),
    ).rejects.toThrow();
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it("does not enable writes without a dated live format receipt", async () => {
    const fetcher = fetchMock();
    const client = new BufferClient({ accessToken: "token", fetch: fetcher });
    await expect(
      client.editPost(post, { text: "River Studio." }),
    ).rejects.toMatchObject({ kind: "unsupported" });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("keeps unspecified metadata, media, tags, scheduling and approval policy omitted", async () => {
    const fetcher = fetchMock(
      response({
        data: {
          editPost: {
            __typename: "PostActionSuccess",
            post: { ...post, text: "River Studio." },
          },
        },
      }),
    );
    const receipts: ApiReceipt[] = [];
    const client = new BufferClient({
      accessToken: "SECRET-OAUTH-TOKEN",
      fetch: fetcher,
      verifiedFormats,
      onReceipt: (receipt) => {
        receipts.push(receipt);
      },
    });
    const result = await client.editPost(post, { text: "River Studio." });
    expect(body(fetcher).variables.input).toEqual({
      id: "post-1",
      text: "River Studio.",
    });
    expect(result.metadata?.firstComment).toBe("Keep this.");
    expect(result.tags).toEqual(post.tags);
    expect(JSON.stringify(receipts)).not.toContain("SECRET-OAUTH-TOKEN");
    expect(receipts[0].response).toBeTruthy();
  });

  it("rejects arbitrary edit fields and emits only explicit schedule and image changes", () => {
    expect(() =>
      narrowEditInput("p", { text: "New", approvalChange: "approve" } as never),
    ).toThrow();
    expect(
      narrowEditInput("p", { fixedScheduledAt: "2026-11-21T10:00:00Z" }),
    ).toEqual({
      id: "p",
      mode: "customScheduled",
      dueAt: "2026-11-21T10:00:00Z",
    });
    expect(
      narrowEditInput("p", {
        replacementImage: {
          url: "https://cdn.example/poster-v2.png",
          altText: "New event details.",
        },
      }),
    ).toEqual({
      id: "p",
      assets: [
        {
          image: {
            url: "https://cdn.example/poster-v2.png",
            metadata: { altText: "New event details.", userTags: [] },
          },
        },
      ],
    });
    expect(() =>
      narrowEditInput("p", {
        replacementImage: {
          url: "http://localhost/poster.png",
          altText: "Poster",
        },
      }),
    ).toThrow(/HTTPS/);
  });

  it("blocks mentions, unsupported media, approval and revoked allowedActions", async () => {
    expect(
      unsupportedReason({
        ...post,
        metadata: {
          ...post.metadata!,
          annotations: [
            {
              type: "mention",
              text: "@studio",
              content: "@studio",
              indices: [0, 7],
              url: "https://example.com",
            },
          ],
        },
      }),
    ).toMatch(/mentions/);
    expect(unsupportedReason({ ...post, status: "needs_approval" })).toMatch(
      /approval/,
    );
    expect(
      unsupportedReason({
        ...post,
        assets: [
          {
            __typename: "VideoAsset",
            id: "v",
            source: "url",
            thumbnail: "url",
            mimeType: "video/mp4",
            type: "video",
          },
        ],
      }),
    ).toMatch(/single static-image/);
    const client = new BufferClient({
      accessToken: "token",
      fetch: fetchMock(),
      verifiedFormats,
    });
    await expect(
      client.editPost({ ...post, allowedActions: [] }, { text: "New" }),
    ).rejects.toMatchObject({ kind: "authentication" });
    await expect(
      client.editPost({ ...post, status: "sending" }, { text: "New" }),
    ).rejects.toMatchObject({ kind: "unsupported" });
  });

  it("distinguishes GraphQL, mutation and uncertain transport outcomes without retry", async () => {
    const graphql = fetchMock(
      response({ errors: [{ message: "Unexpected failure" }] }),
    );
    await expect(
      new BufferClient({
        accessToken: "t",
        fetch: graphql,
        verifiedFormats,
      }).editPost(post, { text: "New" }),
    ).rejects.toMatchObject({ kind: "graphql", uncertain: true });
    const rejected = fetchMock(
      response({
        data: {
          editPost: {
            __typename: "VoidMutationError",
            message: "Permission changed.",
          },
        },
      }),
    );
    await expect(
      new BufferClient({
        accessToken: "t",
        fetch: rejected,
        verifiedFormats,
      }).editPost(post, { text: "New" }),
    ).rejects.toMatchObject({ kind: "mutation", uncertain: false });
    const timeout = fetchMock(new Error("timeout"));
    await expect(
      new BufferClient({
        accessToken: "t",
        fetch: timeout,
        verifiedFormats,
      }).editPost(post, { text: "New" }),
    ).rejects.toMatchObject({ kind: "transport", uncertain: true });
    expect(graphql).toHaveBeenCalledTimes(1);
    expect(rejected).toHaveBeenCalledTimes(1);
    expect(timeout).toHaveBeenCalledTimes(1);
  });

  it("honors Retry-After and prevents another request before the cooldown", async () => {
    const fetcher = fetchMock(
      response(
        { errors: [{ message: "Rate limited" }] },
        { status: 429, headers: { "Retry-After": "753" } },
      ),
    );
    const client = new BufferClient({
      accessToken: "token",
      fetch: fetcher,
      now: () => 1000,
    });
    await expect(client.account()).rejects.toMatchObject({
      kind: "rate_limit",
      retryAfterSeconds: 753,
    });
    await expect(client.account()).rejects.toMatchObject({
      kind: "rate_limit",
      retryAfterSeconds: 753,
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("creates a distinct draft with exactly the reviewed destination and text", async () => {
    const correction = {
      ...post,
      id: "new-draft",
      status: "draft",
      text: "Correction: River Studio, Sunday.",
      dueAt: null,
    };
    const fetcher = fetchMock(
      response({
        data: {
          createPost: { __typename: "PostActionSuccess", post: correction },
        },
      }),
    );
    const result = await new BufferClient({
      accessToken: "token",
      fetch: fetcher,
      verifiedFormats,
    }).createCorrectionDraft(channel, { text: correction.text });
    expect(result.id).not.toBe(post.id);
    expect(body(fetcher).variables.input).toEqual({
      channelId: channel.id,
      text: correction.text,
      assets: [],
      mode: "addToQueue",
      schedulingType: "automatic",
      saveToDraft: true,
      needsApproval: false,
    });
    expect(body(fetcher).query).not.toContain("deletePost");
  });

  it("never blindly retries an uncertain draft creation and rejects malformed successful responses", async () => {
    const timeout = fetchMock(new Error("response lost"));
    await expect(
      new BufferClient({
        accessToken: "t",
        fetch: timeout,
        verifiedFormats,
      }).createCorrectionDraft(channel, { text: "Correction." }),
    ).rejects.toMatchObject({ uncertain: true });
    expect(timeout).toHaveBeenCalledTimes(1);
    const malformed = fetchMock(
      response({
        data: {
          createPost: {
            __typename: "PostActionSuccess",
            post: { id: "draft" },
          },
        },
      }),
    );
    await expect(
      new BufferClient({
        accessToken: "t",
        fetch: malformed,
        verifiedFormats,
      }).createCorrectionDraft(channel, { text: "Correction." }),
    ).rejects.toBeInstanceOf(BufferApiError);
  });
});

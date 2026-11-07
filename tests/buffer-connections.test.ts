import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomBytes } from "node:crypto";
import { openDatabase, migrate, type Database } from "../src/server/db";
import {
  clientFor,
  saveConnection,
  getConnection,
  normalizePost,
  finishOAuth,
} from "../src/server/connections";
import { encryptTokens, decryptTokens, type BufferPost } from "../src/buffer";

let db: Database;
const key = randomBytes(32).toString("base64");
const account = {
  id: "buffer-user",
  name: "Owner",
  organizations: [{ id: "org-1", name: "Studio" }],
};
const scopes = ["account:read", "posts:read", "posts:write", "offline_access"];
async function owner(id: string, expiresAt = Date.now() + 3_600_000) {
  await db.query("INSERT INTO users(id) VALUES($1)", [id]);
  await saveConnection(db, id, {
    status: "connected",
    organizations: [],
    channels: [],
    encrypted: encryptTokens(
      {
        accessToken: `access-${id}`,
        refreshToken: `refresh-${id}`,
        expiresAt,
        scopes,
      },
      key,
      id,
    ),
  });
}

beforeAll(async () => {
  vi.stubEnv("TOKEN_ENCRYPTION_KEY", key);
  vi.stubEnv("BUFFER_CLIENT_ID", "test-client");
  vi.stubEnv("BUFFER_CLIENT_SECRET", "test-secret");
  vi.stubEnv(
    "BUFFER_REDIRECT_URI",
    "https://changeboard.example/auth/callback",
  );
  vi.stubEnv("LIVE_FORMAT_EVIDENCE_FILE", "");
  db = await openDatabase(":memory:");
  await migrate(db);
}, 90_000);
afterAll(async () => {
  await db.close();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
}, 30_000);

describe("connection persistence (PostgreSQL engine + simulated Buffer transport)", () => {
  it("serializes single-use token refresh and atomically stores the rotated pair", async () => {
    await owner("refresh-owner", Date.now() - 1000);
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          access_token: "rotated-access",
          refresh_token: "rotated-refresh",
          expires_in: 3600,
          token_type: "Bearer",
          scope: scopes.join(" "),
        }),
      ),
    );
    vi.stubGlobal("fetch", fetcher);
    const [first, second] = await Promise.all([
      clientFor(db, "refresh-owner"),
      clientFor(db, "refresh-owner"),
    ]);
    expect(fetcher).toHaveBeenCalledTimes(1);
    const saved = await getConnection(db, "refresh-owner");
    const tokens = decryptTokens(saved.encrypted!, key, "refresh-owner");
    expect(tokens.accessToken).toBe("rotated-access");
    expect(tokens.refreshToken).toBe("rotated-refresh");
    expect(first).toBe(second);
  });

  it("preserves cached discovery across repeated clientFor calls but isolates owners", async () => {
    await owner("cache-owner");
    await owner("other-owner");
    const fetcher = vi
      .fn<typeof fetch>()
      .mockImplementation(
        async () => new Response(JSON.stringify({ data: { account } })),
      );
    vi.stubGlobal("fetch", fetcher);
    const first = await clientFor(db, "cache-owner");
    await first.account();
    const second = await clientFor(db, "cache-owner");
    await second.account();
    expect(first).toBe(second);
    const other = await clientFor(db, "other-owner");
    expect(other).not.toBe(first);
    await other.account();
    expect(fetcher).toHaveBeenCalledTimes(2);
    const saved = await getConnection(db, "cache-owner");
    expect(saved.apiReceipts).toHaveLength(1);
    expect(JSON.stringify(saved.apiReceipts)).not.toContain(
      "access-cache-owner",
    );
    // A route can have loaded connection settings before a remote read; saving those
    // settings afterward must not erase the new private receipt or a concurrent cooldown.
    await saveConnection(db, "cache-owner", {
      ...saved,
      apiReceipts: [],
      organizationId: "org-1",
    });
    expect((await getConnection(db, "cache-owner")).apiReceipts).toHaveLength(
      1,
    );
  });

  it("persists revoked state and destroys local tokens on 401", async () => {
    await owner("revoked-owner");
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("{}", { status: 401 }));
    vi.stubGlobal("fetch", fetcher);
    const client = await clientFor(db, "revoked-owner");
    await expect(client.account()).rejects.toMatchObject({
      kind: "authentication",
    });
    const saved = await getConnection(db, "revoked-owner");
    expect(saved.status).toBe("revoked");
    expect(saved.encrypted).toBeUndefined();
    await expect(clientFor(db, "revoked-owner")).rejects.toMatchObject({
      kind: "authentication",
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("keeps an ambiguous refresh expired instead of replaying the single-use token", async () => {
    await owner("unknown-refresh-owner", Date.now() - 1);
    const fetcher = vi
      .fn<typeof fetch>()
      .mockRejectedValue(new Error("lost response"));
    vi.stubGlobal("fetch", fetcher);
    await expect(clientFor(db, "unknown-refresh-owner")).rejects.toMatchObject({
      kind: "authentication",
    });
    await expect(clientFor(db, "unknown-refresh-owner")).rejects.toMatchObject({
      kind: "authentication",
    });
    const saved = await getConnection(db, "unknown-refresh-owner");
    expect(saved.status).toBe("expired");
    expect(saved.encrypted).toBeUndefined();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("normalizes known formats without treating URL annotations as structured mentions", () => {
    const post = {
      id: "p",
      text: "Visit https://example.com",
      channelId: "c",
      channelService: "facebook",
      status: "scheduled",
      dueAt: "2026-12-01T12:00:00Z",
      shareMode: "shareNext",
      isCustomScheduled: false,
      schedulingType: "automatic",
      allowedActions: ["updatePost"],
      assets: [],
      tags: [],
      metadata: {
        __typename: "FacebookPostMetadata",
        type: "post",
        annotations: [
          {
            type: "url",
            text: "https://example.com",
            content: "https://example.com",
            indices: [6, 25],
            url: "https://example.com",
          },
        ],
      },
      channel: {
        id: "c",
        organizationId: "org",
        name: "Studio",
        displayName: null,
        service: "facebook",
        type: "page",
        timezone: "Europe/London",
        allowedActions: ["manageUpdates"],
        isDisconnected: false,
        isLocked: false,
        isQueuePaused: true,
      },
      createdAt: "2026-10-01T00:00:00Z",
      updatedAt: "2026-10-25T00:00:00Z",
      sentAt: null,
    } satisfies BufferPost;
    const normalized = normalizePost(post);
    expect(normalized.structuredMentions).toBe(false);
    expect(normalized.allowedActions).toContain("updatePost");
    expect(normalized.metadata.shareMode).toBe("shareNext");
    expect(normalized.metadata.channelQueuePaused).toBe(true);
    expect(normalized.metadata.updatedAt).toBeUndefined();
    expect(
      normalizePost({ ...post, metadata: { ...post.metadata, type: "reel" } })
        .metadata.unsupportedReason,
    ).toMatch(/ordinary posts/);
  });

  it("refuses forged callback state without consuming an attempt or disconnecting the owner", async () => {
    await owner("callback-owner");
    const attempt = {
      state: "real-state",
      verifier: "verifier",
      createdAt: Date.now(),
    };
    await db.query(
      "INSERT INTO sessions(id,user_id,csrf,expires_at,oauth) VALUES($1,$2,$3,now()+interval '1 day',$4)",
      ["callback-session", "callback-owner", "csrf", JSON.stringify(attempt)],
    );
    await expect(
      finishOAuth(db, "callback-session", "callback-owner", {
        state: "forged",
        code: "code",
      }),
    ).rejects.toMatchObject({ kind: "authentication" });
    const row = (
      await db.query<{ oauth: unknown }>(
        "SELECT oauth FROM sessions WHERE id=$1",
        ["callback-session"],
      )
    ).rows[0];
    expect(row.oauth).toEqual(attempt);
    expect((await getConnection(db, "callback-owner")).status).toBe(
      "connected",
    );
  });

  it("keeps different verified Buffer identities in different local owners and reconnects to the same owner", async () => {
    await owner("switching-browser");
    const sessionId = "switching-session";
    await db.query(
      "INSERT INTO sessions(id,user_id,csrf,expires_at) VALUES($1,$2,$3,now()+interval '1 day')",
      [sessionId, "switching-browser", "csrf"],
    );
    const fetcher = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetcher);
    async function connect(currentOwner: string, bufferAccountId: string) {
      const attempt = {
        state: `state-${bufferAccountId}`,
        verifier: "verifier",
        createdAt: Date.now(),
      };
      await db.query("UPDATE sessions SET oauth=$2 WHERE id=$1", [
        sessionId,
        JSON.stringify(attempt),
      ]);
      fetcher.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            access_token: `access-${bufferAccountId}`,
            refresh_token: `refresh-${bufferAccountId}`,
            expires_in: 3600,
            token_type: "Bearer",
            scope: scopes.join(" "),
          }),
        ),
      );
      fetcher.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: { account: { ...account, id: bufferAccountId } },
          }),
        ),
      );
      return finishOAuth(db, sessionId, currentOwner, {
        state: attempt.state,
        code: "one-time-code",
      });
    }
    const a = await connect("switching-browser", "identity-A");
    await db.query("UPDATE users SET active_campaign_id=$2 WHERE id=$1", [
      a,
      "only-A-campaign",
    ]);
    const b = await connect(a, "identity-B");
    expect(b).not.toBe(a);
    const rowB = (
      await db.query<{ active_campaign_id: string | null }>(
        "SELECT active_campaign_id FROM users WHERE id=$1",
        [b],
      )
    ).rows[0];
    expect(rowB.active_campaign_id).toBeNull();
    expect((await getConnection(db, a)).bufferUserId).toBe("identity-A");
    const aAgain = await connect(b, "identity-A");
    expect(aAgain).toBe(a);
    const rowA = (
      await db.query<{ active_campaign_id: string }>(
        "SELECT active_campaign_id FROM users WHERE id=$1",
        [aAgain],
      )
    ).rows[0];
    expect(rowA.active_campaign_id).toBe("only-A-campaign");
    expect((await getConnection(db, b)).bufferUserId).toBe("identity-B");
  });

  it("persists app-wide Retry-After across owners and new clientFor calls", async () => {
    await owner("limited-owner");
    await owner("limited-other-owner");
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response("{}", { status: 429, headers: { "Retry-After": "120" } }),
      );
    vi.stubGlobal("fetch", fetcher);
    const client = await clientFor(db, "limited-owner");
    await expect(client.account()).rejects.toMatchObject({
      kind: "rate_limit",
    });
    expect(
      (await getConnection(db, "limited-owner")).rateLimitUntil,
    ).toBeGreaterThan(Date.now());
    await saveConnection(db, "limited-owner", {
      status: "not_connected",
      organizations: [],
      channels: [],
    });
    await expect(clientFor(db, "limited-owner")).rejects.toMatchObject({
      kind: "rate_limit",
    });
    await expect(clientFor(db, "limited-other-owner")).rejects.toMatchObject({
      kind: "rate_limit",
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});

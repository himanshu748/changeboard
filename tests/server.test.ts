import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { randomBytes } from "node:crypto";
import type { Server } from "node:http";
import { createApp } from "../src/server/app";
import { openDatabase, migrate, type Database } from "../src/server/db";
import { Worker, gatewayFor, type RemoteGateway } from "../src/server/worker";
import type { StoredOperation } from "../src/server/service";
import type { AppState, Facts, Snapshot } from "../src/shared";
import {
  BufferApiError,
  encryptTokens,
  type BufferChannel,
} from "../src/buffer";
import { saveConnection } from "../src/server/connections";

interface BrowserSession {
  cookie: string;
  csrf: string;
  state: AppState;
}
let db: Database, worker: Worker, server: Server, origin: string;
let factoryOverride:
  | ((
      db: Database,
      userId: string,
      op: StoredOperation,
    ) => Promise<RemoteGateway>)
  | undefined;
const changed: Facts = {
  date: "2026-11-22",
  time: "16:00",
  venue: "River Studio",
  address: "",
  timezone: "Europe/London",
};

async function session(): Promise<BrowserSession> {
  const response = await fetch(`${origin}/api/state`);
  const state = (await response.json()) as AppState;
  return {
    cookie: response.headers.get("set-cookie")!.split(";")[0],
    csrf: state.csrf,
    state,
  };
}

async function request(
  s: BrowserSession,
  path: string,
  body?: unknown,
  expected = 200,
): Promise<AppState> {
  const response = await fetch(`${origin}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      Cookie: s.cookie,
      "Content-Type": "application/json",
      "X-CSRF-Token": s.csrf,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const result = await response.json();
  expect(response.status, JSON.stringify(result)).toBe(expected);
  if (expected === 200 && "csrf" in result) {
    s.state = result;
    s.csrf = result.csrf;
  }
  return result;
}

async function setup(
  s: BrowserSession,
  ids = ["sample-1", "sample-2", "sample-3"],
) {
  await request(s, "/api/sample", {});
  await request(s, "/api/campaign/select", {
    postIds: ids,
    announcementId: "sample-published",
  });
  await request(s, "/api/campaign/facts", {
    facts: s.state.campaign!.facts,
    confirmed: true,
  });
  const bindings = s.state.campaign!.posts.flatMap((post) =>
    post.bindings.map((binding) => ({
      postId: post.snapshot.id,
      bindingId: binding.id,
      confirmed: true,
    })),
  );
  for (const binding of bindings)
    await request(s, "/api/campaign/binding", binding);
}

async function ready(s: BrowserSession) {
  await request(s, "/api/campaign/propose", { facts: changed });
  for (const post of s.state.campaign!.posts) {
    if (post.snapshot.assets.length)
      await request(s, "/api/campaign/media", {
        postId: post.snapshot.id,
        status: "accurate",
        acknowledged: true,
      });
    if (post.bindings.some((b) => b.kind === "relative"))
      await request(s, "/api/campaign/schedule", {
        postId: post.snapshot.id,
        schedule: { strategy: "keep", fixedTimeConfirmed: true },
      });
  }
}

async function apply(s: BrowserSession) {
  const set = s.state.campaign!.changeSet!;
  await request(s, "/api/campaign/apply", {
    changeSetId: set.id,
    revision: set.revision,
  });
  return set;
}

async function settle(s: BrowserSession) {
  for (let i = 0; i < 8; i++) await worker.tick();
  await request(s, "/api/state");
}

beforeAll(async () => {
  db = await openDatabase(":memory:");
  await migrate(db);
  worker = new Worker(db, (database, userId, op) =>
    factoryOverride
      ? factoryOverride(database, userId, op)
      : gatewayFor(database, userId, op),
  );
  const app = createApp(db, worker);
  server = await new Promise<Server>((resolve, reject) => {
    const listening = app.listen(0, "127.0.0.1", (error?: Error) =>
      error ? reject(error) : resolve(listening),
    );
  });
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("No test server address.");
  origin = `http://127.0.0.1:${address.port}`;
}, 120000);

beforeEach(async () => {
  factoryOverride = undefined;
  await db.query("TRUNCATE users CASCADE");
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
afterAll(async () => {
  worker?.stop();
  if (server?.listening)
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  await db?.close();
});

describe("server-backed campaign journey", () => {
  it("discovers a newly connected channel when the user confirms the same organization again", async () => {
    const s = await session();
    const userId = (
      await db.query<{ user_id: string }>(
        "SELECT user_id FROM sessions WHERE csrf=$1",
        [s.csrf],
      )
    ).rows[0].user_id;
    const key = randomBytes(32).toString("base64");
    vi.stubEnv("TOKEN_ENCRYPTION_KEY", key);
    const organizations = [{ id: "org-discovery", name: "Pages" }];
    await saveConnection(db, userId, {
      status: "connected",
      organizations,
      channels: [],
      encrypted: encryptTokens(
        {
          accessToken: "simulated-access",
          refreshToken: "simulated-refresh",
          expiresAt: Date.now() + 3_600_000,
          scopes: [
            "account:read",
            "posts:read",
            "posts:write",
            "offline_access",
          ],
        },
        key,
        userId,
      ),
    });
    const nativeFetch = globalThis.fetch;
    let channels: BufferChannel[] = [];
    let channelReads = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async (input, init) => {
        const url =
          typeof input === "string"
            ? input
            : input instanceof URL
              ? input.href
              : input.url;
        if (url.startsWith(origin)) return nativeFetch(input, init);
        expect(url).toBe("https://api.buffer.com");
        const { query } = JSON.parse(String(init?.body));
        expect(query.trim().startsWith("query ")).toBe(true);
        if (query.includes("ChangeboardAccount"))
          return Response.json({
            data: {
              account: { id: "buffer-discovery", name: "Owner", organizations },
            },
          });
        expect(query).toContain("ChangeboardChannels");
        channelReads++;
        return Response.json({ data: { channels } });
      }),
    );
    await request(s, "/api/organization", { organizationId: "org-discovery" });
    expect(s.state.connection.channels).toEqual([]);
    channels = [
      {
        id: "new-page",
        organizationId: "org-discovery",
        name: "New Page",
        displayName: null,
        service: "facebook",
        type: "page",
        timezone: "UTC",
        allowedActions: [],
        isDisconnected: false,
        isLocked: false,
        isQueuePaused: false,
      },
    ];
    await request(s, "/api/organization", { organizationId: "org-discovery" });
    expect(s.state.connection.channels.map((channel) => channel.id)).toEqual([
      "new-page",
    ]);
    expect(channelReads).toBe(2);
  });

  it("preserves confirmed associations through an unchanged source-fact save and a second verified repair", async () => {
    const s = await session();
    await setup(s);
    const originalIds = s.state.campaign!.posts[0].bindings.map((b) => b.id);
    await request(s, "/api/campaign/facts", {
      facts: s.state.campaign!.facts,
      confirmed: true,
    });
    expect(
      s.state.campaign!.posts.every((p) =>
        p.bindings.every((b) => b.confirmed),
      ),
    ).toBe(true);
    await ready(s);
    expect(
      s.state.campaign!.changeSet!.proposals.every((p) => p.eligible),
    ).toBe(true);
    await apply(s);
    await settle(s);
    expect(s.state.campaign!.operations.map((op) => op.status)).toEqual([
      "succeeded",
      "succeeded",
      "succeeded",
    ]);
    expect(s.state.campaign!.posts[0].snapshot.text).toContain(
      "River Studio this Sunday",
    );
    expect(s.state.campaign!.posts[1].snapshot.text).toContain(
      "In 2 days at 4 p.m.",
    );
    await request(s, "/api/state");
    expect(s.state.campaign!.operations).toHaveLength(3);
    await request(s, "/api/campaign/next", {});
    expect(s.state.campaign!.posts[0].bindings.map((b) => b.id)).toEqual(
      originalIds,
    );
    await request(s, "/api/campaign/propose", {
      facts: { ...changed, venue: "The Little Kiln" },
    });
    expect(s.state.campaign!.changeSet!.proposals[0].after.text).toContain(
      "The Little Kiln this Sunday",
    );
    expect(
      s.state.campaign!.changeSet!.proposals[0].issues.some(
        (i) => i.code === "IMAGE_NEEDS_REVIEW",
      ),
    ).toBe(true);
    for (const p of s.state.campaign!.posts.filter(
      (p) => p.snapshot.assets.length,
    ))
      await request(s, "/api/campaign/media", {
        postId: p.snapshot.id,
        status: "accurate",
        acknowledged: true,
      });
    await apply(s);
    await settle(s);
    expect(s.state.campaign!.posts[0].snapshot.text).toBe(
      "Join Clay After Hours at The Little Kiln this Sunday. Materials and tea included.",
    );
    expect(s.state.campaign!.originalFacts.venue).toBe("Mill Studio");
  }, 30000);

  it("withholds stale images until revision-specific review and previews the exact generated poster", async () => {
    const s = await session();
    await setup(s, ["sample-1"]);
    await request(s, "/api/campaign/propose", { facts: changed });
    expect(s.state.campaign!.changeSet!.proposals[0].eligible).toBe(false);
    await request(s, "/api/campaign/media", {
      postId: "sample-1",
      status: "poster",
      acknowledged: false,
    });
    const previewUrl = s.state.campaign!.posts[0].media.url!;
    const image = await fetch(`${origin}${previewUrl}`);
    expect(image.status).toBe(200);
    expect(image.headers.get("content-type")).toContain("image/png");
    expect(s.state.campaign!.changeSet!.proposals[0].eligible).toBe(false);
    await request(s, "/api/campaign/media", {
      postId: "sample-1",
      status: "poster",
      acknowledged: true,
    });
    expect(s.state.campaign!.posts[0].media.url).toBe(previewUrl);
    expect(s.state.campaign!.changeSet!.proposals[0].after.assets[0].url).toBe(
      previewUrl,
    );
    await apply(s);
    await settle(s);
    expect(s.state.campaign!.operations[0].status).toBe("succeeded");
    expect(
      (
        await db.query<{ retained: boolean }>(
          "SELECT retained FROM assets WHERE id=$1",
          [previewUrl.split("/").at(-1)],
        )
      ).rows[0].retained,
    ).toBe(true);
  }, 30000);

  it("invalidates old immutable approvals and rejects arbitrary browser mutation payloads", async () => {
    const s = await session();
    await setup(s, ["sample-3"]);
    await ready(s);
    const old = s.state.campaign!.changeSet!;
    await request(s, "/api/campaign/preview", { selectedPostIds: [] });
    await request(
      s,
      "/api/campaign/apply",
      { changeSetId: old.id, revision: old.revision },
      409,
    );
    const latest = s.state.campaign!.changeSet!;
    await request(
      s,
      "/api/campaign/apply",
      { changeSetId: latest.id, revision: latest.revision, text: "tampered" },
      400,
    );
    expect((await db.query("SELECT id FROM operations")).rows).toHaveLength(0);
  });

  it("isolates local owners even when a second session submits a known change-set or media ID", async () => {
    const a = await session();
    await setup(a, ["sample-3"]);
    await ready(a);
    const b = await session();
    await setup(b, ["sample-1"]);
    const set = a.state.campaign!.changeSet!;
    await request(
      b,
      "/api/campaign/apply",
      { changeSetId: set.id, revision: set.revision },
      404,
    );
    const aMedia = a.state.campaign!.availablePosts[0].assets[0].url;
    await request(
      b,
      "/api/campaign/media",
      {
        postId: "sample-1",
        status: "replacement",
        acknowledged: true,
        url: aMedia,
      },
      403,
    );
    const response = await fetch(`${origin}/api/sample`, {
      method: "POST",
      headers: { Cookie: a.cookie, "Content-Type": "application/json" },
      body: "{}",
    });
    expect(response.status).toBe(403);
  });

  it("preserves partial success, fresh external conflicts and skipped publication state across refresh", async () => {
    const s = await session();
    await setup(s);
    await ready(s);
    await apply(s);
    await request(s, "/api/sample/conflict", { postId: "sample-3" });
    factoryOverride = async (database, userId, op) => {
      const remote = await gatewayFor(database, userId, op);
      return op.postId === "sample-2"
        ? {
            ...remote,
            edit: async () => {
              throw new BufferApiError(
                "Simulated provider rejection",
                "mutation",
              );
            },
          }
        : remote;
    };
    await settle(s);
    expect(
      Object.fromEntries(
        s.state.campaign!.operations.map((op) => [op.postId, op.status]),
      ),
    ).toEqual({
      "sample-1": "succeeded",
      "sample-2": "failed",
      "sample-3": "needs_review",
    });
    expect(s.state.campaign!.posts[0].baselineFacts.venue).toBe("River Studio");
    expect(s.state.campaign!.posts[2].baselineFacts.venue).toBe("Mill Studio");
    await request(s, "/api/state");
    expect(s.state.campaign!.operations).toHaveLength(3);
    const id = (await db.query<{ id: string }>("SELECT id FROM users LIMIT 1"))
      .rows[0].id;
    const remote = (
      await db.query<{ data: Snapshot }>(
        "SELECT data FROM sample_remote WHERE user_id=$1 AND post_id=$2",
        [id, "sample-3"],
      )
    ).rows[0].data;
    expect(remote.status).toBe("scheduled");
    expect(remote.text).toContain("Doors open early.");
  });

  it("makes apply idempotent locally and reconciles a lost edit response without a second write", async () => {
    const s = await session();
    await setup(s, ["sample-3"]);
    await ready(s);
    let edits = 0;
    factoryOverride = async (database, userId, op) => {
      const remote = await gatewayFor(database, userId, op);
      return {
        ...remote,
        edit: async (before, after, action) => {
          edits++;
          await remote.edit(before, after, action);
          throw new BufferApiError("Lost reply", "transport", true);
        },
      };
    };
    const set = await apply(s);
    await request(s, "/api/campaign/apply", {
      changeSetId: set.id,
      revision: set.revision,
    });
    await settle(s);
    expect(edits).toBe(1);
    expect(s.state.campaign!.operations).toHaveLength(1);
    expect(s.state.campaign!.operations[0].status).toBe("succeeded");
    await request(s, "/api/campaign/apply", {
      changeSetId: set.id,
      revision: set.revision,
    });
    await settle(s);
    expect(edits).toBe(1);
  });

  it("creates a separate reviewed correction draft and leaves the original announcement unchanged", async () => {
    const s = await session();
    await setup(s, ["sample-3"]);
    await ready(s);
    const correction = s.state.campaign!.correction!;
    await request(
      s,
      "/api/campaign/correction",
      {
        ...correction,
        announcementId: undefined,
        text: correction.text,
        channelId: correction.channelId,
        approve: true,
      },
      409,
    );
    await request(s, "/api/campaign/correction", {
      text: correction.text,
      channelId: correction.channelId,
      approve: false,
    });
    await request(s, "/api/campaign/correction", {
      text: correction.text,
      channelId: correction.channelId,
      approve: true,
    });
    await settle(s);
    expect(s.state.campaign!.operations[0].action).toBe("correction");
    expect(s.state.campaign!.operations[0].status).toBe("succeeded");
    expect(s.state.campaign!.announcement!.status).toBe("sent");
    expect(s.state.campaign!.announcement!.text).toContain("Mill Studio");
    expect(s.state.campaign!.operations[0].remoteId).not.toBe(
      "sample-published",
    );
  });

  it("keeps an uncertain create unresolved and forbids another create after a new revision", async () => {
    const s = await session();
    await setup(s, ["sample-3"]);
    await ready(s);
    let creates = 0;
    factoryOverride = async (database, userId, op) => {
      const remote = await gatewayFor(database, userId, op);
      return {
        ...remote,
        create: async () => {
          creates++;
          throw new BufferApiError("Lost create reply", "transport", true);
        },
      };
    };
    const correction = s.state.campaign!.correction!;
    await request(s, "/api/campaign/correction", {
      text: correction.text,
      channelId: correction.channelId,
      approve: false,
    });
    await request(s, "/api/campaign/correction", {
      text: correction.text,
      channelId: correction.channelId,
      approve: true,
    });
    await settle(s);
    expect(s.state.campaign!.operations[0].status).toBe("uncertain");
    await request(
      s,
      "/api/campaign/reconcile",
      { operationId: s.state.campaign!.operations[0].id },
      409,
    );
    await request(s, "/api/campaign/propose", {
      facts: { ...changed, venue: "Another studio" },
    });
    await request(
      s,
      "/api/campaign/correction",
      {
        text: "Reviewed revised correction",
        channelId: correction.channelId,
        approve: false,
      },
      409,
    );
    await settle(s);
    expect(creates).toBe(1);
  });

  it("moving to draft bypasses fact edits but keeps status, cutoff, format and move-permission gates", async () => {
    const s = await session();
    await setup(s, ["sample-3"]);
    await ready(s);
    const original = structuredClone(s.state.campaign!);
    const userId = (
      await db.query<{ id: string }>("SELECT id FROM users LIMIT 1")
    ).rows[0].id;
    for (const override of [
      { status: "sending" },
      { scheduledAt: new Date(Date.now() + 5 * 60_000).toISOString() },
      { allowedActions: ["edit"] },
      { metadata: { channelDisconnected: true } },
    ]) {
      const c = structuredClone(original);
      const target = { ...c.posts[0].snapshot, ...override };
      c.posts[0].snapshot = target;
      await db.query("UPDATE campaigns SET data=$2 WHERE id=$1", [
        c.id,
        JSON.stringify(c),
      ]);
      await db.query(
        "UPDATE sample_remote SET data=$3 WHERE user_id=$1 AND post_id=$2",
        [userId, target.id, JSON.stringify(target)],
      );
      await request(s, "/api/campaign/move-to-draft", {
        postId: "sample-3",
        confirm: true,
      });
      expect(s.state.campaign!.changeSet!.proposals[0].eligible).toBe(false);
    }
    await db.query("UPDATE campaigns SET data=$2 WHERE id=$1", [
      original.id,
      JSON.stringify(original),
    ]);
    await db.query(
      "UPDATE sample_remote SET data=$3 WHERE user_id=$1 AND post_id=$2",
      [
        userId,
        original.posts[0].snapshot.id,
        JSON.stringify(original.posts[0].snapshot),
      ],
    );
    await request(s, "/api/campaign/move-to-draft", {
      postId: "sample-3",
      confirm: true,
    });
    expect(s.state.campaign!.changeSet!.proposals[0].eligible).toBe(true);
    await apply(s);
    await settle(s);
    expect(s.state.campaign!.posts[0].snapshot.status).toBe("draft");
    expect(s.state.campaign!.posts[0].snapshot.text).toBe(
      original.posts[0].snapshot.text,
    );
  });
});

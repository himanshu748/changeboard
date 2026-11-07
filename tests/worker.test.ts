import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { migrate, openDatabase, type Database } from "../src/server/db";
import {
  Worker,
  matchesIntended,
  type RemoteGateway,
} from "../src/server/worker";
import { saveCampaign, type StoredOperation } from "../src/server/service";
import { sampleCampaign } from "../src/server/sample";
import { createBinding, fingerprintSnapshot, repairPost } from "../src/domain";
import { BufferApiError } from "../src/buffer";
import type { Campaign, Snapshot } from "../src/shared";

let db: Database;
beforeAll(async () => {
  db = await openDatabase(":memory:");
  await migrate(db);
}, 120000);
beforeEach(async () => {
  await db.query("TRUNCATE users CASCADE");
});
afterAll(async () => {
  await db?.close();
});

function source(): Snapshot {
  return {
    id: "post",
    text: "Meet at Mill Studio. Tea included.",
    channelId: "channel",
    channelName: "Clay",
    service: "facebook",
    status: "scheduled",
    scheduledAt: "2099-11-20T12:00:00Z",
    mode: "customScheduled",
    assets: [],
    metadata: { tags: ["clay"] },
    allowedActions: ["edit", "moveToDraft"],
    channelTimezone: "Europe/London",
  };
}

async function seed(action: StoredOperation["action"] = "edit") {
  const userId = randomUUID();
  await db.query("INSERT INTO users(id) VALUES($1)", [userId]);
  const campaign = sampleCampaign("/media/example");
  const before = source();
  const old = {
    date: "2099-11-21",
    time: "18:00",
    venue: "Mill Studio",
    address: "",
    timezone: "Europe/London",
  };
  const facts = { ...old, venue: "River Studio" };
  const bindings = [
    {
      ...createBinding(before, { fact: "venue", text: "Mill Studio" }),
      confirmed: true,
    },
  ];
  const repair = repairPost(before, bindings, old, facts);
  const after = {
    ...before,
    text: repair.text,
    ...(action === "correction"
      ? {
          id: "new-draft",
          status: "draft",
          mode: "draft" as const,
          scheduledAt: null,
        }
      : {}),
  };
  campaign.posts = [
    {
      snapshot: before,
      bindings,
      media: { revision: 1, status: "accurate", acknowledged: true },
      schedule: { strategy: "keep" },
      selected: true,
      baselineFacts: old,
    },
  ];
  campaign.availablePosts = [before];
  campaign.proposedFacts = facts;
  campaign.revision = 1;
  await saveCampaign(db, userId, campaign);
  const now = new Date().toISOString();
  const op: StoredOperation = {
    id: randomUUID(),
    changeSetId: randomUUID(),
    postId: before.id,
    action,
    status: "pending",
    message: "pending",
    createdAt: now,
    updatedAt: now,
    before,
    after,
    attempts: 0,
    mode: "sample",
    organizationId: "sample-organization",
    facts,
    bindings: repair.bindings,
  };
  await db.query(
    "INSERT INTO operations(id,campaign_id,user_id,unique_key,status,data) VALUES($1,$2,$3,$4,$5,$6)",
    [op.id, campaign.id, userId, randomUUID(), op.status, JSON.stringify(op)],
  );
  const read = async () =>
    (
      await db.query<{ data: StoredOperation }>(
        "SELECT data FROM operations WHERE id=$1",
        [op.id],
      )
    ).rows[0].data;
  return { userId, campaign, op, before, after, read };
}

describe("verification field integrity", () => {
  it("compares equivalent UTC timestamps semantically", () => {
    const p = source();
    expect(
      matchesIntended(
        { ...p, scheduledAt: "2099-11-20T12:00:00.000Z" },
        p,
        "edit",
      ),
    ).toBe(true);
    expect(
      matchesIntended(
        { ...p, scheduledAt: "2099-11-20T12:00:00.000001Z" },
        p,
        "edit",
      ),
    ).toBe(false);
  });

  it("does not verify an existing image when its tags, type, identity or empty alt text changed", () => {
    const wanted = {
      ...source(),
      assets: [
        {
          id: "image-1",
          type: "image",
          url: "https://example.com/image.png",
          altText: "",
          metadata: {
            mimeType: "image/png",
            userTags: [{ handle: "clay", x: 0.2, y: 0.4 }],
          },
        },
      ],
    };
    for (const asset of [
      {
        ...wanted.assets[0],
        metadata: { ...wanted.assets[0].metadata, userTags: [] },
      },
      { ...wanted.assets[0], type: "video" },
      { ...wanted.assets[0], id: "different" },
      { ...wanted.assets[0], altText: "unexpected alt" },
    ])
      expect(
        matchesIntended({ ...wanted, assets: [asset] }, wanted, "edit"),
      ).toBe(false);
  });

  it("permits provider dimensions on a replacement but never copied positional tags", () => {
    const wanted = {
      ...source(),
      assets: [
        {
          type: "image",
          url: "https://example.com/new.png",
          altText: "New poster",
        },
      ],
    };
    expect(
      matchesIntended(
        {
          ...wanted,
          assets: [
            {
              ...wanted.assets[0],
              id: "new-image",
              metadata: { mimeType: "image/png", userTags: [] },
            },
          ],
        },
        wanted,
        "edit",
      ),
    ).toBe(true);
    expect(
      matchesIntended(
        {
          ...wanted,
          assets: [
            {
              ...wanted.assets[0],
              metadata: { userTags: [{ handle: "old", x: 0, y: 0 }] },
            },
          ],
        },
        wanted,
        "edit",
      ),
    ).toBe(false);
  });

  it("checks metadata and unscheduled state after moving a post to draft", () => {
    const draft = {
      ...source(),
      status: "draft",
      mode: "draft" as const,
      scheduledAt: null,
    };
    expect(
      matchesIntended(
        { ...draft, metadata: { tags: [] } },
        draft,
        "move_to_draft",
      ),
    ).toBe(false);
    expect(
      matchesIntended(
        { ...draft, scheduledAt: source().scheduledAt },
        draft,
        "move_to_draft",
      ),
    ).toBe(false);
    expect(matchesIntended(draft, draft, "move_to_draft")).toBe(true);
  });
});

describe("durable outcomes and lease fencing", () => {
  it("keeps a successful edit uncertain if all post-write verification reads fail with authentication errors", async () => {
    const s = await seed();
    let reads = 0,
      writes = 0;
    const remote: RemoteGateway = {
      read: async () => {
        if (++reads === 1) return s.before;
        throw new BufferApiError(
          "Access revoked after write",
          "authentication",
        );
      },
      edit: async () => {
        writes++;
      },
      create: async () => "unused",
    };
    const worker = new Worker(db, async () => remote);
    await worker.tick();
    const outcome = await s.read();
    expect(outcome.status).toBe("uncertain");
    expect(writes).toBe(1);
    await worker.tick();
    expect(writes).toBe(1);
  });

  it("retains a known created draft ID when verification fails, preventing a blind duplicate", async () => {
    const s = await seed("correction");
    let creates = 0;
    const remote: RemoteGateway = {
      read: async () => {
        throw new BufferApiError(
          "Rate limited after create",
          "rate_limit",
          false,
          60,
        );
      },
      edit: async () => {},
      create: async () => {
        creates++;
        return "known-new-draft";
      },
    };
    const worker = new Worker(db, async () => remote);
    await worker.tick();
    const outcome = await s.read();
    expect(outcome.status).toBe("uncertain");
    expect(outcome.remoteId).toBe("known-new-draft");
    await worker.tick();
    expect(creates).toBe(1);
  });

  it("recovers an expired running lease as uncertain without resending the operation", async () => {
    const s = await seed();
    const running = { ...s.op, status: "running" as const, attempts: 1 };
    await db.query(
      "UPDATE operations SET status='running',data=$2,lease_until=now()-interval '1 second' WHERE id=$1",
      [s.op.id, JSON.stringify(running)],
    );
    let calls = 0;
    const worker = new Worker(db, async () => {
      calls++;
      throw new Error("Should not dispatch");
    });
    await worker.tick();
    expect((await s.read()).status).toBe("uncertain");
    expect(calls).toBe(0);
  });

  it("rechecks the lease immediately before a write after a slow source read", async () => {
    const s = await seed();
    let writes = 0;
    const remote: RemoteGateway = {
      read: async () => {
        await db.query(
          "UPDATE operations SET lease_until=now()-interval '1 second' WHERE id=$1",
          [s.op.id],
        );
        return s.before;
      },
      edit: async () => {
        writes++;
      },
      create: async () => "unused",
    };
    const worker = new Worker(db, async () => remote);
    await worker.tick();
    await worker.tick();
    expect(writes).toBe(0);
    expect((await s.read()).status).toBe("uncertain");
  });

  it("keeps an uncertain update uncertain when a fresh read still matches its source", async () => {
    const s = await seed();
    const uncertain = { ...s.op, status: "uncertain" as const, attempts: 1 };
    await db.query(
      "UPDATE operations SET status='uncertain',data=$2 WHERE id=$1",
      [s.op.id, JSON.stringify(uncertain)],
    );
    let writes = 0;
    const remote: RemoteGateway = {
      read: async () => s.before,
      edit: async () => {
        writes++;
      },
      create: async () => "unused",
    };
    const worker = new Worker(db, async () => remote);
    await worker.reconcile(s.userId, s.op.id);
    expect((await s.read()).status).toBe("uncertain");
    expect(writes).toBe(0);
    expect((await s.read()).message).toContain("could complete later");
  });

  it("fences a stale worker completion after another reconciliation changed the result", async () => {
    const s = await seed();
    const stale = { ...s.op, status: "running" as const, attempts: 1 };
    await db.query(
      "UPDATE operations SET status='needs_review',data=$2,lease_until=NULL WHERE id=$1",
      [s.op.id, JSON.stringify({ ...stale, status: "needs_review" })],
    );
    const worker = new Worker(db);
    expect(
      await worker.finish(
        s.userId,
        s.campaign.id,
        stale,
        "succeeded",
        "Old worker completed",
        s.after,
      ),
    ).toBe(false);
    expect((await s.read()).status).toBe("needs_review");
    const campaign = (
      await db.query<{ data: Campaign }>(
        "SELECT data FROM campaigns WHERE id=$1",
        [s.campaign.id],
      )
    ).rows[0].data;
    expect(campaign.posts[0].snapshot.text).toBe(s.before.text);
  });

  it("will not rebase a newer independently reviewed source when an older operation is verified", async () => {
    const s = await seed();
    const running = { ...s.op, status: "running" as const, attempts: 1 };
    await db.query(
      "UPDATE operations SET status='running',data=$2,lease_until=now()+interval '120 seconds' WHERE id=$1",
      [s.op.id, JSON.stringify(running)],
    );
    const newer = {
      ...s.after,
      text: "Newer independently reviewed campaign text.",
    };
    s.campaign.posts[0].snapshot = newer;
    s.campaign.posts[0].bindings = [];
    await saveCampaign(db, s.userId, s.campaign);
    const worker = new Worker(db);
    expect(
      await worker.finish(
        s.userId,
        s.campaign.id,
        running,
        "succeeded",
        "Observed old outcome",
        s.after,
      ),
    ).toBe(true);
    const saved = (
      await db.query<{ data: Campaign }>(
        "SELECT data FROM campaigns WHERE id=$1",
        [s.campaign.id],
      )
    ).rows[0].data;
    expect(saved.posts[0].snapshot.text).toBe(newer.text);
    expect(saved.posts[0].bindings).toEqual([]);
  });

  it("invalidates a newer preview when reconciliation advances an unchanged source under new proposed facts", async () => {
    const s = await seed();
    const uncertain = { ...s.op, status: "uncertain" as const, attempts: 1 };
    await db.query(
      "UPDATE operations SET status='uncertain',data=$2 WHERE id=$1",
      [s.op.id, JSON.stringify(uncertain)],
    );
    s.campaign.revision = 2;
    s.campaign.proposedFacts = { ...s.op.facts, venue: "Another venue" };
    s.campaign.changeSet = {
      id: "new-review",
      revision: 2,
      campaignVersion: s.campaign.version,
      createdAt: new Date().toISOString(),
      proposals: [],
      applied: false,
    };
    await saveCampaign(db, s.userId, s.campaign);
    const worker = new Worker(db);
    await worker.finish(
      s.userId,
      s.campaign.id,
      uncertain,
      "succeeded",
      "Old result reconciled",
      s.after,
    );
    const saved = (
      await db.query<{ data: Campaign }>(
        "SELECT data FROM campaigns WHERE id=$1",
        [s.campaign.id],
      )
    ).rows[0].data;
    expect(saved.changeSet).toBeUndefined();
    expect(saved.posts[0].media.acknowledged).toBe(false);
    expect(saved.posts[0].baselineFacts.venue).toBe("River Studio");
    expect(saved.posts[0].bindings[0].sourceFingerprint).toBe(
      fingerprintSnapshot(s.after),
    );
  });
});

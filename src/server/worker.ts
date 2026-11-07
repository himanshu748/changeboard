import { randomUUID } from "node:crypto";
import { Temporal } from "@js-temporal/polyfill";
import type { Database, Sql } from "./db";
import { jsonRow } from "./db";
import type { Campaign, Snapshot, OperationStatus } from "../shared";
import { fingerprintSnapshot, eligibility } from "../domain";
import { BufferApiError, type NarrowPostEdit } from "../buffer";
import { clientFor, normalizePost } from "./connections";
import { type StoredOperation, saveCampaign, HttpError } from "./service";
export interface RemoteGateway {
  read(id: string): Promise<Snapshot>;
  edit(before: Snapshot, after: Snapshot, action: string): Promise<void>;
  create(after: Snapshot): Promise<string>;
}
function mediaUrl(url: string) {
  if (
    url.startsWith("/media/") &&
    (process.env.PUBLIC_MEDIA_ORIGIN || process.env.APP_ORIGIN)
  )
    return new URL(
      url,
      process.env.PUBLIC_MEDIA_ORIGIN || process.env.APP_ORIGIN,
    ).toString();
  return url;
}
function stableJson(value: unknown): string {
  if (Array.isArray(value)) return "[" + value.map(stableJson).join(",") + "]";
  if (value && typeof value === "object")
    return (
      "{" +
      Object.entries(value)
        .filter(([, v]) => v !== undefined)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => JSON.stringify(k) + ":" + stableJson(v))
        .join(",") +
      "}"
    );
  return JSON.stringify(value);
}
function assetMatch(actual: Snapshot, wanted: Snapshot) {
  return (
    actual.assets.length === wanted.assets.length &&
    actual.assets.every((a, i) => {
      const expected = wanted.assets[i];
      if (
        mediaUrl(a.url) !== mediaUrl(expected.url) ||
        a.type !== expected.type ||
        (a.altText ?? "") !== (expected.altText ?? "")
      )
        return false;
      if (expected.id !== undefined && a.id !== expected.id) return false;
      if (expected.metadata !== undefined)
        return stableJson(a.metadata) === stableJson(expected.metadata);
      // A replacement intentionally has no old asset ID or positional metadata.
      // Buffer can add dimensions/MIME metadata, but must not inherit old image tags.
      const tags = a.metadata?.userTags;
      return tags == null || (Array.isArray(tags) && tags.length === 0);
    })
  );
}
function sameInstant(a: string | null, b: string | null) {
  if (a === b) return true;
  if (!a || !b) return false;
  try {
    return (
      Temporal.Instant.compare(
        Temporal.Instant.from(a),
        Temporal.Instant.from(b),
      ) === 0
    );
  } catch {
    return false;
  }
}
export function matchesIntended(
  actual: Snapshot,
  wanted: Snapshot,
  action: string,
) {
  if (
    actual.text !== wanted.text ||
    actual.channelId !== wanted.channelId ||
    !assetMatch(actual, wanted)
  )
    return false;
  if (action === "correction") return actual.status === "draft";
  return (
    actual.status === wanted.status &&
    actual.mode === wanted.mode &&
    sameInstant(actual.scheduledAt, wanted.scheduledAt) &&
    stableJson(actual.metadata) === stableJson(wanted.metadata)
  );
}
export async function gatewayFor(
  db: Database,
  userId: string,
  op: StoredOperation,
): Promise<RemoteGateway> {
  if (op.mode === "sample")
    return {
      read: async (id) => {
        const p = await jsonRow<Snapshot>(
          db,
          "SELECT data FROM sample_remote WHERE user_id=$1 AND post_id=$2",
          [userId, id],
        );
        if (!p) throw new Error("Sample post no longer exists.");
        return p;
      },
      edit: async (_before, after) => {
        await db.query(
          "UPDATE sample_remote SET data=$3 WHERE user_id=$1 AND post_id=$2",
          [userId, after.id, JSON.stringify(after)],
        );
      },
      create: async (after) => {
        const id = `sample-correction-${randomUUID()}`;
        await db.query(
          "INSERT INTO sample_remote(user_id,post_id,data) VALUES($1,$2,$3)",
          [userId, id, JSON.stringify({ ...after, id })],
        );
        return id;
      },
    };
  const client = await clientFor(db, userId);
  return {
    read: async (id) => {
      const p = await client.post(id);
      if (p.channel.organizationId !== op.organizationId)
        throw new HttpError(403, "Post organization no longer matches.");
      return normalizePost(p);
    },
    edit: async (before, after, action) => {
      const current = await client.post(before.id);
      if (
        current.channel.organizationId !== op.organizationId ||
        fingerprintSnapshot(normalizePost(current)) !==
          fingerprintSnapshot(before)
      )
        throw new HttpError(
          409,
          "Changed in Buffer immediately before editing.",
        );
      const edit: NarrowPostEdit = {};
      if (action === "move_to_draft") edit.moveToDraft = true;
      else {
        if (after.text !== before.text) edit.text = after.text;
        if (after.scheduledAt !== before.scheduledAt && after.scheduledAt)
          edit.fixedScheduledAt = after.scheduledAt;
        if (JSON.stringify(after.assets) !== JSON.stringify(before.assets)) {
          const asset = after.assets[0];
          if (!asset) throw new Error("Clearing images is unsupported.");
          const origin =
            process.env.PUBLIC_MEDIA_ORIGIN || process.env.APP_ORIGIN;
          if (!origin?.startsWith("https://"))
            throw new Error(
              "Configure a stable PUBLIC_MEDIA_ORIGIN with HTTPS before replacing live images.",
            );
          edit.replacementImage = {
            url: new URL(asset.url, origin).toString(),
            altText: asset.altText || "",
          };
        }
      }
      await client.editPost(current, edit);
    },
    create: async (after) => {
      const channels = await client.channels(op.organizationId, true);
      const channel = channels.find((c) => c.id === after.channelId);
      if (!channel)
        throw new HttpError(
          403,
          "This correction destination is no longer available.",
        );
      const result = await client.createCorrectionDraft(channel, {
        text: after.text,
      });
      return result.id;
    },
  };
}
export class Worker {
  private active = false;
  private timer?: ReturnType<typeof setInterval>;
  constructor(
    private db: Database,
    private factory = gatewayFor,
  ) {}
  start() {
    const run = () => {
      void this.tick().catch(() =>
        console.error(
          "Operation worker failed; persisted jobs retained for recovery.",
        ),
      );
    };
    this.timer = setInterval(run, 700);
    this.timer.unref();
    run();
  }
  stop() {
    if (this.timer) clearInterval(this.timer);
  }
  async tick() {
    if (this.active) return;
    this.active = true;
    try {
      // A process may have died after a remote write. Expired leases become uncertain, never pending.
      await this.db.transaction(async (tx) => {
        const expired = await tx.query<{ id: string; data: StoredOperation }>(
          "SELECT id,data FROM operations WHERE status='running' AND lease_until < now() FOR UPDATE",
        );
        for (const row of expired.rows) {
          row.data.status = "uncertain";
          row.data.message =
            "The worker stopped before verification. Check the remote outcome before another attempt.";
          row.data.updatedAt = new Date().toISOString();
          await tx.query(
            "UPDATE operations SET status='uncertain',data=$2,lease_until=NULL WHERE id=$1",
            [row.id, JSON.stringify(row.data)],
          );
        }
      });
      const job = await this.db.transaction(async (tx) => {
        const row = (
          await tx.query<{
            id: string;
            campaign_id: string;
            user_id: string;
            data: StoredOperation;
          }>(
            "SELECT id,campaign_id,user_id,data FROM operations WHERE status='pending' ORDER BY created_at LIMIT 1 FOR UPDATE SKIP LOCKED",
          )
        ).rows[0];
        if (!row) return;
        row.data.status = "running";
        row.data.attempts++;
        row.data.updatedAt = new Date().toISOString();
        await tx.query(
          "UPDATE operations SET status='running',data=$2,lease_until=now()+interval '120 seconds' WHERE id=$1",
          [row.id, JSON.stringify(row.data)],
        );
        return row;
      });
      if (job) await this.execute(job.user_id, job.campaign_id, job.data);
    } finally {
      this.active = false;
    }
  }
  async finish(
    userId: string,
    campaignId: string,
    op: StoredOperation,
    status: OperationStatus,
    message: string,
    verified?: Snapshot,
  ) {
    const expectedStatus = op.status,
      expectedAttempts = op.attempts;
    const finished = {
      ...op,
      status,
      message,
      updatedAt: new Date().toISOString(),
    };
    return this.db.transaction(async (tx) => {
      const updated = await tx.query(
        "UPDATE operations SET status=$2,data=$3,lease_until=NULL WHERE id=$1 AND user_id=$4 AND status=$5 AND (data->>'attempts')::integer=$6 AND ($5 <> 'running' OR lease_until>now()) RETURNING id",
        [
          op.id,
          status,
          JSON.stringify(finished),
          userId,
          expectedStatus,
          expectedAttempts,
        ],
      );
      // An expired worker or competing reconciliation cannot overwrite a newer result.
      if (!updated.rows.length) return false;
      if (verified && status === "succeeded" && op.action !== "correction") {
        const c = await jsonRow<Campaign>(
          tx,
          "SELECT data FROM campaigns WHERE id=$1 AND user_id=$2 FOR UPDATE",
          [campaignId, userId],
        );
        if (!c) return true;
        const linked = c.posts.find((p) => p.snapshot.id === op.postId);
        if (
          linked &&
          fingerprintSnapshot(linked.snapshot) ===
            fingerprintSnapshot(op.before)
        ) {
          linked.snapshot = verified;
          linked.bindings = op.bindings
            .filter((b) => b.confirmed && !b.ignored)
            .map((b) => ({
              ...b,
              sourceFingerprint: fingerprintSnapshot(verified),
            }));
          if (op.action === "edit") linked.baselineFacts = op.facts;
          linked.media =
            stableJson(op.facts) === stableJson(c.proposedFacts)
              ? { ...linked.media, revision: c.revision }
              : {
                  revision: c.revision,
                  status: "needs_review",
                  acknowledged: false,
                };
          c.availablePosts = c.availablePosts.map((p) =>
            p.id === op.postId ? verified : p,
          );
          c.version++;
          if (c.changeSet && !c.changeSet.applied) delete c.changeSet;
          await saveCampaign(tx, userId, c);
        }
        for (const asset of verified.assets) {
          const id = asset.url.match(/\/media\/([a-f0-9-]+)$/)?.[1];
          if (id)
            await tx.query(
              "UPDATE assets SET retained=true WHERE id=$1 AND user_id=$2",
              [id, userId],
            );
        }
      }
      return true;
    });
  }
  private async renewLease(userId: string, op: StoredOperation) {
    const result = await this.db.query(
      "UPDATE operations SET lease_until=now()+interval '120 seconds' WHERE id=$1 AND user_id=$2 AND status='running' AND (data->>'attempts')::integer=$3 AND lease_until>now() RETURNING id",
      [op.id, userId, op.attempts],
    );
    return result.rows.length > 0;
  }
  private async execute(
    userId: string,
    campaignId: string,
    op: StoredOperation,
  ) {
    let gateway: RemoteGateway | undefined;
    let writeStarted = false,
      writeReturned = false;
    try {
      gateway = await this.factory(this.db, userId, op);
      if (op.action === "correction") {
        // Create has no remote idempotency guarantee. The durable local unique key prevents local replay.
        if (!(await this.renewLease(userId, op))) return;
        writeStarted = true;
        op.remoteId = await gateway.create(op.after);
        writeReturned = true;
        // Keep a known remote ID even if the lease expired while Buffer was responding.
        await this.db.query(
          "UPDATE operations SET data=jsonb_set(data,'{remoteId}',to_jsonb($2::text)) WHERE id=$1 AND user_id=$3 AND (data->>'attempts')::integer=$4 AND status IN ('running','uncertain')",
          [op.id, op.remoteId, userId, op.attempts],
        );
        const actual = await gateway.read(op.remoteId);
        if (!matchesIntended(actual, op.after, "correction")) {
          await this.finish(
            userId,
            campaignId,
            op,
            "uncertain",
            "The draft was returned but its content could not be verified. Do not create another draft.",
          );
          return;
        }
        await this.finish(
          userId,
          campaignId,
          op,
          "succeeded",
          op.mode === "sample"
            ? "Correction draft verified in sample. Original announcement unchanged."
            : "New Buffer correction draft created and verified. Original announcement unchanged.",
        );
        return;
      }
      const current = await gateway.read(op.postId);
      if (fingerprintSnapshot(current) !== fingerprintSnapshot(op.before)) {
        await this.finish(
          userId,
          campaignId,
          op,
          "needs_review",
          "Changed in Buffer after approval. No update was sent; refresh the source and review again.",
        );
        return;
      }
      const check = eligibility(current, {
        cutoffMinutes: Number(process.env.PUBLICATION_CUTOFF_MINUTES || 10),
      });
      if (!check.eligible) {
        await this.finish(
          userId,
          campaignId,
          op,
          "needs_review",
          check.issues.map((i) => i.message).join(" "),
        );
        return;
      }
      // Retain assets before a call that could succeed with a lost response.
      for (const asset of op.after.assets) {
        const id = asset.url.match(/\/media\/([a-f0-9-]+)$/)?.[1];
        if (id)
          await this.db.query(
            "UPDATE assets SET retained=true WHERE id=$1 AND user_id=$2",
            [id, userId],
          );
      }
      if (!(await this.renewLease(userId, op))) return;
      writeStarted = true;
      await gateway.edit(current, op.after, op.action);
      writeReturned = true;
      const actual = await gateway.read(op.postId);
      if (!matchesIntended(actual, op.after, op.action)) {
        await this.finish(
          userId,
          campaignId,
          op,
          "uncertain",
          "The returned post does not match every approved field. Inspect Buffer before another attempt.",
        );
        return;
      }
      await this.finish(
        userId,
        campaignId,
        op,
        "succeeded",
        op.mode === "sample"
          ? "Verified in sample. No Buffer posts changed."
          : op.action === "move_to_draft"
            ? "Moved to draft and verified."
            : "Updated and verified.",
        actual,
      );
    } catch (error) {
      const ambiguous =
        writeStarted &&
        (writeReturned ||
          (error instanceof BufferApiError
            ? error.uncertain
            : !(error instanceof HttpError)));
      if (ambiguous && gateway && op.action !== "correction") {
        try {
          const actual = await gateway.read(op.postId);
          if (matchesIntended(actual, op.after, op.action)) {
            await this.finish(
              userId,
              campaignId,
              op,
              "succeeded",
              "The response was interrupted; the approved outcome was verified by re-reading.",
              actual,
            );
            return;
          }
        } catch {
          /* Keep uncertain. No write retry. */
        }
      }
      const message =
        error instanceof Error
          ? error.message
          : "The operation could not be completed.";
      await this.finish(
        userId,
        campaignId,
        op,
        ambiguous
          ? "uncertain"
          : error instanceof HttpError && error.status === 409
            ? "needs_review"
            : "failed",
        ambiguous
          ? `Outcome uncertain. ${message} No automatic retry was made.`
          : message,
      );
    }
  }
  async reconcile(userId: string, operationId: string) {
    const row = (
      await this.db.query<{ campaign_id: string; data: StoredOperation }>(
        "SELECT campaign_id,data FROM operations WHERE id=$1 AND user_id=$2",
        [operationId, userId],
      )
    ).rows[0];
    if (!row) throw new HttpError(404, "Operation not found.");
    const op = row.data;
    if (op.status !== "uncertain")
      throw new HttpError(
        409,
        "Only uncertain operations need reconciliation.",
      );
    if (op.action === "correction" && !op.remoteId)
      throw new HttpError(
        409,
        "The create response did not include a draft ID. Inspect Buffer manually; creating another draft could duplicate it.",
      );
    const gateway = await this.factory(this.db, userId, op);
    const actual = await gateway.read(op.remoteId || op.postId);
    if (matchesIntended(actual, op.after, op.action)) {
      await this.finish(
        userId,
        row.campaign_id,
        op,
        "succeeded",
        "Approved outcome verified by a fresh read.",
        actual,
      );
    } else if (
      op.action !== "correction" &&
      fingerprintSnapshot(actual) === fingerprintSnapshot(op.before)
    ) {
      await this.finish(
        userId,
        row.campaign_id,
        op,
        "uncertain",
        "The original state is still visible, but a lost-response update could complete later. Inspect Buffer before any new attempt; no automatic retry was made.",
      );
    } else
      await this.finish(
        userId,
        row.campaign_id,
        op,
        "uncertain",
        "The observed post matches neither approved outcome nor source. Inspect Buffer; no automatic retry.",
      );
  }
}

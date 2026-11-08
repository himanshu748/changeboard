import { randomUUID } from "node:crypto";
import { z } from "zod";
import type {
  Campaign,
  AppState,
  LinkedPost,
  Snapshot,
  ChangeSet,
  Proposal,
  Operation,
  Facts,
} from "../shared";
import {
  FactsSchema,
  createBinding,
  suggestBindings,
  validateBindings,
  validateFacts,
  repairPost,
  fingerprintSnapshot,
  eligibility,
} from "../domain";
import type { Database, Sql } from "./db";
import { jsonRow } from "./db";
import { poster } from "./assets";
import { sampleCampaign } from "./sample";
import { readEvidence } from "./read-evidence";
import { liveFormatAllows } from "../buffer/evidence";
import {
  getConnection,
  configured,
  liveEvidence,
  clientFor,
  normalizePost,
} from "./connections";
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export interface StoredOperation extends Operation {
  mode: "sample" | "live";
  organizationId: string;
  facts: Facts;
  bindings: LinkedPost["bindings"];
}
export const identifier = z.string().min(1).max(200);
export const scheduleSchema = z
  .object({
    strategy: z
      .enum(["keep", "preserve_offset", "explicit_date", "fix_time"])
      .optional(),
    fixedTimeConfirmed: z.boolean().optional(),
    offsetConfirmed: z.boolean().optional(),
    fixedLocalTime: z.string().max(32).optional(),
  })
  .strict();
const clone = <T>(x: T): T => structuredClone(x);
export async function campaignFor(
  db: Sql,
  userId: string,
): Promise<Campaign | undefined> {
  const row = (
    await db.query<{ data: Campaign }>(
      "SELECT c.data FROM campaigns c JOIN users u ON c.id=u.active_campaign_id WHERE u.id=$1 AND c.user_id=$1",
      [userId],
    )
  ).rows[0];
  if (!row) return;
  const ops = await db.query<{ data: Operation }>(
    "SELECT data FROM operations WHERE campaign_id=$1 AND user_id=$2 ORDER BY created_at",
    [row.data.id, userId],
  );
  row.data.operations = ops.rows.map((r) => r.data);
  return row.data;
}
export async function saveCampaign(db: Sql, userId: string, c: Campaign) {
  const data = { ...c, operations: [] };
  await db.query(
    "INSERT INTO campaigns(id,user_id,data) VALUES($1,$2,$3) ON CONFLICT(id) DO UPDATE SET data=$3,updated_at=now() WHERE campaigns.user_id=$2",
    [c.id, userId, JSON.stringify(data)],
  );
}
export async function stateFor(
  db: Database,
  userId: string,
  csrf: string,
): Promise<AppState> {
  const [campaign, c, evidence] = await Promise.all([
    campaignFor(db, userId),
    getConnection(db, userId),
    liveEvidence(),
  ]);
  return {
    csrf,
    campaign,
    connection: {
      status: c.status,
      configured: configured(),
      organizations: c.organizations,
      channels: c.channels.map((ch) => ({
        id: ch.id,
        name: ch.displayName || ch.name,
        service: ch.service,
        timezone: ch.timezone,
      })),
      organizationId: c.organizationId,
      message: c.message,
      readReceipts: readEvidence(c.apiReceipts),
    },
    liveVerifiedServices: [
      ...new Set(evidence.map((e) => e.key.split(":")[0])),
    ],
    liveWriteNotice: evidence.some((e) => e.scope)
      ? "Live writes are limited to caption edits on explicitly validated unpublished test drafts. Scheduling, publishing, images and correction drafts are not enabled by this test."
      : undefined,
  };
}
export function requireCampaign(c: Campaign | undefined): Campaign {
  if (!c) throw new HttpError(404, "Choose a campaign first.");
  return c;
}
export function getLinked(c: Campaign, id: string) {
  const p = c.posts.find((p) => p.snapshot.id === id);
  if (!p) throw new HttpError(404, "This post is not part of your campaign.");
  return p;
}
export function touch(c: Campaign) {
  c.version++;
  delete c.changeSet;
}
export async function mutateCampaign<T>(
  db: Database,
  userId: string,
  fn: (c: Campaign, tx: Sql) => Promise<T>,
  allowRunning = false,
): Promise<T> {
  return db.transaction(async (tx) => {
    const r = (
      await tx.query<{ data: Campaign }>(
        "SELECT c.data FROM campaigns c JOIN users u ON c.id=u.active_campaign_id WHERE u.id=$1 AND c.user_id=$1 FOR UPDATE OF c",
        [userId],
      )
    ).rows[0];
    const c = requireCampaign(r?.data);
    if (
      !allowRunning &&
      (
        await tx.query(
          "SELECT id FROM operations WHERE campaign_id=$1 AND status IN ('pending','running') LIMIT 1",
          [c.id],
        )
      ).rows.length
    )
      throw new HttpError(
        409,
        "Updates are still running. Wait for the individual results.",
      );
    const value = await fn(c, tx);
    await saveCampaign(tx, userId, c);
    return value;
  });
}
export async function startSample(db: Database, userId: string) {
  await db.transaction(async (tx) => {
    if (
      (
        await tx.query(
          "SELECT id FROM operations WHERE user_id=$1 AND status IN ('pending','running') LIMIT 1",
          [userId],
        )
      ).rows.length
    )
      throw new HttpError(
        409,
        "Wait for running updates before starting a new sample.",
      );
    const asset = await poster(
      tx,
      userId,
      {
        date: "2026-11-21",
        time: "18:00",
        venue: "Mill Studio",
        address: "",
        timezone: "Europe/London",
      },
      "Clay After Hours",
    );
    const c = sampleCampaign(asset.url);
    await saveCampaign(tx, userId, c);
    await tx.query("UPDATE users SET active_campaign_id=$2 WHERE id=$1", [
      userId,
      c.id,
    ]);
    for (const p of c.availablePosts)
      await tx.query(
        "INSERT INTO sample_remote(user_id,post_id,data) VALUES($1,$2,$3) ON CONFLICT(user_id,post_id) DO UPDATE SET data=$3",
        [userId, p.id, JSON.stringify(p)],
      );
    await tx.query(
      "INSERT INTO fact_revisions(campaign_id,revision,facts) VALUES($1,0,$2)",
      [c.id, JSON.stringify(c.facts)],
    );
  });
}
export async function currentSnapshot(
  db: Database,
  userId: string,
  c: Pick<Campaign, "mode" | "organizationId">,
  postId: string,
): Promise<Snapshot> {
  if (c.mode === "sample") {
    const p = await jsonRow<Snapshot>(
      db,
      "SELECT data FROM sample_remote WHERE user_id=$1 AND post_id=$2",
      [userId, postId],
    );
    if (!p) throw new HttpError(404, "The sample post is missing.");
    return p;
  }
  const client = await clientFor(db, userId);
  const p = await client.post(postId);
  if (p.channel.organizationId !== c.organizationId)
    throw new HttpError(403, "This post is outside the selected organization.");
  return normalizePost(p);
}
export async function preparePreview(
  db: Database,
  userId: string,
  selectedPostIds?: string[],
  action?: { postId: string; kind: "move_to_draft" },
) {
  // Remote reads occur before the local transaction; pre-write recheck is authoritative.
  const existing = requireCampaign(await campaignFor(db, userId));
  if (action) getLinked(existing, action.postId);
  if (
    selectedPostIds &&
    (new Set(selectedPostIds).size !== selectedPostIds.length ||
      selectedPostIds.some(
        (id) => !existing.posts.some((p) => p.snapshot.id === id),
      ))
  )
    throw new HttpError(400, "Select distinct posts from this campaign.");
  const observed = new Map<string, Snapshot>();
  for (const p of existing.posts)
    observed.set(
      p.snapshot.id,
      await currentSnapshot(db, userId, existing, p.snapshot.id),
    );
  const evidence = await liveEvidence();
  await mutateCampaign(db, userId, async (c, tx) => {
    if (c.version !== existing.version)
      throw new HttpError(
        409,
        "The campaign changed while refreshing. Preview again.",
      );
    if (!c.factsConfirmed)
      throw new HttpError(
        409,
        "Confirm the source facts before preparing updates.",
      );
    const proposals: Proposal[] = [];
    for (const p of c.posts) {
      const before = clone(p.snapshot),
        current = observed.get(before.id)!;
      const cutoffMinutes = Number(
        process.env.PUBLICATION_CUTOFF_MINUTES || 10,
      );
      if (!Number.isFinite(cutoffMinutes) || cutoffMinutes < 0)
        throw new HttpError(
          503,
          "The publication safety-window configuration is invalid.",
        );
      const repair = repairPost(
        before,
        p.bindings,
        p.baselineFacts,
        c.proposedFacts,
        { ...p.schedule, cutoffMinutes },
      );
      const issues = [...repair.issues];
      const isMove = action?.postId === before.id;
      if (fingerprintSnapshot(before) !== fingerprintSnapshot(current))
        issues.push({
          code: "EXTERNAL_EDIT",
          message:
            c.mode === "sample"
              ? "Changed in simulated Buffer after import. Refresh the source and reconnect facts."
              : "Changed in Buffer. Refresh the source and reconnect facts.",
          severity: "error",
        });
      if (c.mode === "live") {
        const key = `${before.service}:${String(before.metadata.channelType)}:${before.assets.length ? "single-image" : "text"}`;
        if (
          !evidence.some((e) =>
            liveFormatAllows(e, {
              key,
              channelId: before.channelId,
              postId: before.id,
              status: before.status,
              operation: "edit",
              captionOnly:
                !isMove &&
                before.assets.length === 0 &&
                repair.scheduledAt === before.scheduledAt &&
                repair.mode === before.mode,
            }),
          )
        )
          issues.push({
            code: "UNVERIFIED_CHANNEL",
            message: `Live ${key} writes require a matching dated verification receipt and operation scope.`,
            severity: "error",
          });
      }
      const media = clone(p.media);
      let assets = clone(before.assets);
      if (!isMove && before.assets.length) {
        if (
          media.revision !== c.revision ||
          media.status === "needs_review" ||
          !media.acknowledged
        )
          issues.push({
            code: "IMAGE_NEEDS_REVIEW",
            message: "Image needs review for this fact revision.",
            severity: "error",
          });
        if (
          (media.status === "poster" || media.status === "replacement") &&
          media.acknowledged
        ) {
          if (!media.url || !media.altText?.trim())
            issues.push({
              code: "INVALID_REPLACEMENT_IMAGE",
              message: "Review the replacement image and provide its alt text.",
              severity: "error",
            });
          else
            assets = [
              { url: media.url, type: "image", altText: media.altText },
            ];
        }
      }
      const after: Snapshot = {
        ...before,
        text: repair.text,
        scheduledAt: repair.scheduledAt,
        mode: repair.mode,
        assets,
      };
      if (
        c.mode === "live" &&
        (after.scheduledAt !== before.scheduledAt ||
          after.mode !== before.mode) &&
        !isMove
      ) {
        if (!before.allowedActions.includes("updatePostSchedule"))
          issues.push({
            code: "SCHEDULE_NOT_PERMITTED",
            message: "Buffer does not permit rescheduling this post.",
            severity: "error",
          });
        after.metadata = { ...before.metadata, shareMode: "customScheduled" };
      }
      if (isMove) {
        after.text = before.text;
        after.assets = before.assets;
        after.status = "draft";
        after.mode = "draft";
        after.scheduledAt = null;
      }
      // Moving to draft bypasses fact/media repairs only. All remote safety checks still apply.
      const filteredIssues = isMove
        ? [
            ...eligibility(before, { cutoffMinutes }).issues,
            ...issues.filter(
              (i) =>
                i.code === "EXTERNAL_EDIT" || i.code === "UNVERIFIED_CHANNEL",
            ),
          ]
        : issues;
      if (
        isMove &&
        !before.allowedActions.some(
          (a) =>
            a === "movePostToDraft" ||
            (c.mode === "sample" && a === "moveToDraft"),
        )
      )
        filteredIssues.push({
          code: "MOVE_TO_DRAFT_NOT_PERMITTED",
          message: "Buffer does not permit moving this post to draft.",
          severity: "error",
        });
      if (isMove && before.status === "draft")
        filteredIssues.push({
          code: "ALREADY_DRAFT",
          message: "This post is already a draft.",
          severity: "error",
        });
      const hasChange =
        fingerprintSnapshot(before) !== fingerprintSnapshot(after);
      if (!hasChange)
        filteredIssues.push({
          code: "NO_CHANGES",
          message: "No approved changes for this post.",
          severity: "warning",
        });
      const eligible =
        hasChange && !filteredIssues.some((i) => i.severity === "error");
      if (!action && selectedPostIds)
        p.selected = selectedPostIds.includes(before.id);
      proposals.push({
        postId: before.id,
        before,
        current,
        after,
        changes: isMove ? [] : repair.changes,
        issues: filteredIssues,
        eligible,
        selected: eligible && (action ? isMove : p.selected),
        media,
        bindings: isMove ? p.bindings : repair.bindings,
        relativeContext: repair.relativeContext,
        offset: repair.offset,
        action: isMove ? "move_to_draft" : "edit",
      });
    }
    c.version++;
    const set: ChangeSet = {
      id: randomUUID(),
      revision: c.revision,
      campaignVersion: c.version,
      createdAt: new Date().toISOString(),
      proposals,
      applied: false,
    };
    c.changeSet = set;
    c.stage = "review";
    await tx.query(
      "INSERT INTO changesets(id,campaign_id,user_id,data) VALUES($1,$2,$3,$4)",
      [set.id, c.id, userId, JSON.stringify(set)],
    );
  });
}
export async function enqueueApply(
  db: Database,
  userId: string,
  setId: string,
  revision: number,
) {
  await mutateCampaign(
    db,
    userId,
    async (c, tx) => {
      const row = (
        await tx.query<{ data: ChangeSet; applied: boolean }>(
          "SELECT data,applied FROM changesets WHERE id=$1 AND campaign_id=$2 AND user_id=$3 FOR UPDATE",
          [setId, c.id, userId],
        )
      ).rows[0];
      if (!row)
        throw new HttpError(404, "This approved change set does not exist.");
      if (row.applied) {
        c.stage = "results";
        return;
      }
      const set = row.data;
      if (
        set.revision !== revision ||
        c.changeSet?.id !== set.id ||
        c.version !== set.campaignVersion
      )
        throw new HttpError(
          409,
          "This preview is out of date. Review the latest changes before applying.",
        );
      if (!set.proposals.some((p) => p.selected && p.eligible))
        throw new HttpError(400, "Select at least one eligible update.");
      for (const p of set.proposals) {
        const now = new Date().toISOString();
        const selected = p.selected && p.eligible;
        const op: StoredOperation = {
          id: randomUUID(),
          changeSetId: set.id,
          postId: p.postId,
          action: p.action,
          status: selected ? "pending" : "skipped",
          message: selected
            ? "Waiting for pre-write verification."
            : p.issues.some((i) => i.code === "EXTERNAL_EDIT")
              ? "Changed in Buffer; skipped. The existing publication schedule is unchanged."
              : "Skipped. The existing publication schedule is unchanged.",
          createdAt: now,
          updatedAt: now,
          before: p.before,
          after: p.after,
          attempts: 0,
          mode: c.mode,
          organizationId: c.organizationId,
          facts: c.proposedFacts,
          bindings: p.bindings,
        };
        await tx.query(
          "INSERT INTO operations(id,campaign_id,user_id,unique_key,status,data) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(unique_key) DO NOTHING",
          [
            op.id,
            c.id,
            userId,
            `${set.id}:${p.postId}:${p.action}`,
            op.status,
            JSON.stringify(op),
          ],
        );
      }
      await tx.query("UPDATE changesets SET applied=true WHERE id=$1", [setId]);
      c.changeSet = { ...set, applied: true };
      c.stage = "results";
    },
    true,
  );
}
export function validateSourceFacts(facts: unknown): Facts {
  const f = FactsSchema.parse(facts);
  const issues = validateFacts(f);
  if (issues.length)
    throw new HttpError(400, issues.map((i) => i.message).join(" "));
  return f;
}
export async function selectPosts(
  db: Database,
  userId: string,
  postIds: string[],
  announcementId?: string,
) {
  await mutateCampaign(db, userId, async (c) => {
    if (
      postIds.length < 1 ||
      postIds.length > 6 ||
      new Set(postIds).size !== postIds.length
    )
      throw new HttpError(400, "Choose between one and six distinct posts.");
    c.posts = postIds.map((id) => {
      const p = c.availablePosts.find((p) => p.id === id);
      if (!p)
        throw new HttpError(403, "Choose a post imported under your account.");
      const eligible = eligibility(p);
      if (!eligible.eligible)
        throw new HttpError(
          400,
          eligible.issues.map((i) => i.message).join(" "),
        );
      const prior = c.posts.find((x) => x.snapshot.id === id);
      return (
        prior || {
          snapshot: p,
          bindings: suggestBindings(p, c.facts),
          media: {
            revision: c.revision,
            status: "needs_review",
            acknowledged: false,
          },
          schedule: { strategy: "keep" },
          selected: true,
          baselineFacts: clone(c.facts),
        }
      );
    });
    if (announcementId) {
      const p = c.availablePosts.find(
        (p) => p.id === announcementId && p.status === "sent",
      );
      if (!p)
        throw new HttpError(
          400,
          "Choose a published announcement from this account.",
        );
      c.announcement = p;
    } else {
      delete c.announcement;
      delete c.correction;
    }
    c.stage = "facts";
    touch(c);
  });
}
export async function updateBinding(
  db: Database,
  userId: string,
  body: unknown,
) {
  const b = z
    .object({
      postId: identifier,
      bindingId: identifier.optional(),
      confirmed: z.boolean().optional(),
      ignored: z.boolean().optional(),
      fact: z.enum(["date", "time", "venue", "address"]).optional(),
      text: z.string().min(1).max(500).optional(),
      occurrence: z.number().int().min(0).max(100).optional(),
      kind: z
        .enum(["literal", "weekday", "date", "time", "relative"])
        .optional(),
    })
    .strict()
    .parse(body);
  await mutateCampaign(db, userId, async (c) => {
    const p = getLinked(c, b.postId);
    if (b.bindingId) {
      const binding = p.bindings.find((x) => x.id === b.bindingId);
      if (!binding) throw new HttpError(404, "Association not found.");
      binding.confirmed = Boolean(b.confirmed);
      binding.ignored = Boolean(b.ignored);
    } else {
      if (!b.fact || !b.text)
        throw new HttpError(400, "Choose a fact and exact caption phrase.");
      const candidate = createBinding(p.snapshot, {
        fact: b.fact,
        text: b.text,
        occurrence: b.occurrence,
        kind: b.kind,
      });
      p.bindings.push({ ...candidate, confirmed: true });
    }
    const issues = validateBindings(p.snapshot, p.bindings);
    if (issues.length)
      throw new HttpError(400, issues.map((i) => i.message).join(" "));
    touch(c);
  });
}
export async function enqueueCorrection(
  db: Database,
  userId: string,
  text: string,
  channelId: string,
  approve: boolean,
) {
  text = z
    .string()
    .min(1)
    .max(5000)
    .refine((t) => t.trim().length > 0, "Correction text must not be empty.")
    .parse(text);
  await mutateCampaign(db, userId, async (c, tx) => {
    if (!c.announcement)
      throw new HttpError(400, "Select a published announcement first.");
    if (!c.factsConfirmed || c.revision < 1)
      throw new HttpError(
        400,
        "Confirm old and new event facts before creating a correction.",
      );
    if (channelId !== c.announcement.channelId)
      throw new HttpError(
        400,
        "Use the explicitly selected announcement channel.",
      );
    if (c.correction?.operationId)
      throw new HttpError(
        409,
        "A correction has already been created or its outcome needs reconciliation.",
      );
    if (
      (
        await tx.query(
          "SELECT id FROM operations WHERE campaign_id=$1 AND user_id=$2 AND status IN ('pending','running','uncertain') AND data->>'action'='correction' LIMIT 1",
          [c.id, userId],
        )
      ).rows.length
    )
      throw new HttpError(
        409,
        "A correction is still running or its outcome is uncertain. Reconcile it before creating another draft.",
      );
    if (!approve) {
      c.correction = Object.assign(
        { announcementId: c.announcement.id, text, channelId },
        {
          revision: c.revision,
          sourceFingerprint: fingerprintSnapshot(c.announcement),
        },
      );
      return;
    }
    if (
      !c.correction ||
      c.correction.text !== text ||
      c.correction.channelId !== channelId
    )
      throw new HttpError(
        409,
        "Save and review this exact correction before creating it.",
      );
    const approval = c.correction as typeof c.correction & {
      revision?: number;
      sourceFingerprint?: string;
    };
    if (
      approval.revision !== c.revision ||
      approval.sourceFingerprint !== fingerprintSnapshot(c.announcement)
    )
      throw new HttpError(
        409,
        "The event facts or announcement changed. Save and review a fresh correction.",
      );
    if (c.mode === "live" && c.announcement.service === "instagram")
      throw new HttpError(
        400,
        "Instagram correction drafts require a separately reviewed image. Select a Facebook announcement for this MVP correction flow.",
      );
    const now = new Date().toISOString();
    const after: Snapshot = {
      ...c.announcement,
      id: `correction-${randomUUID()}`,
      text,
      status: "draft",
      mode: "draft",
      scheduledAt: null,
      assets: [],
      metadata: {},
    };
    const op: StoredOperation = {
      id: randomUUID(),
      changeSetId: `correction-${c.id}-${c.revision}`,
      postId: c.announcement.id,
      action: "correction",
      status: "pending",
      message:
        "Creating a new correction draft; the original announcement is unchanged.",
      createdAt: now,
      updatedAt: now,
      before: c.announcement,
      after,
      attempts: 0,
      mode: c.mode,
      organizationId: c.organizationId,
      facts: c.proposedFacts,
      bindings: [],
    };
    await tx.query(
      "INSERT INTO operations(id,campaign_id,user_id,unique_key,status,data) VALUES($1,$2,$3,$4,$5,$6)",
      [
        op.id,
        c.id,
        userId,
        `${c.id}:correction:${c.revision}:${channelId}`,
        op.status,
        JSON.stringify(op),
      ],
    );
    c.correction = { ...c.correction, approved: true, operationId: op.id };
    c.stage = "results";
  });
}

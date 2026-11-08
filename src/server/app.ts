import express from "express";
import { readFile } from "node:fs/promises";
import {
  randomBytes,
  randomUUID,
  createHash,
  timingSafeEqual,
} from "node:crypto";
import { z } from "zod";
import type { Database } from "./db";
import type { Campaign, Facts, Stage } from "../shared";
import { jsonRow } from "./db";
import {
  stateFor,
  campaignFor,
  saveCampaign,
  startSample,
  selectPosts,
  updateBinding,
  mutateCampaign,
  preparePreview,
  enqueueApply,
  enqueueCorrection,
  getLinked,
  touch,
  requireCampaign,
  identifier,
  scheduleSchema,
  validateSourceFacts,
  HttpError,
  currentSnapshot,
} from "./service";
import {
  getConnection,
  saveConnection,
  emptyConnection,
  clientFor,
  startOAuth,
  finishOAuth,
  normalizePost,
} from "./connections";
import { suggestBindings } from "../domain";
import { BufferApiError } from "../buffer";
import { poster, uploadImage } from "./assets";
import { Worker } from "./worker";
import { repairReceipt } from "./receipt";
const hash = (s: string) => createHash("sha256").update(s).digest("hex");
export interface Session {
  id: string;
  userId: string;
  csrf: string;
}
declare global {
  namespace Express {
    interface Request {
      session: Session;
    }
  }
}
const cookieName = "changeboard_session";
export function createApp(db: Database, worker: Worker) {
  const app = express();
  app.disable("x-powered-by");
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=()",
    );
    res.setHeader(
      "Content-Security-Policy",
      `default-src 'self'; img-src 'self' https: data:; style-src 'self' 'unsafe-inline'; script-src 'self'${process.env.NODE_ENV === "production" ? "" : " 'unsafe-inline'"}; connect-src 'self'${process.env.NODE_ENV === "production" ? "" : " ws://127.0.0.1:* ws://localhost:*"}; frame-ancestors 'none'; base-uri 'self'; form-action 'self' https://auth.buffer.com`,
    );
    next();
  });
  app.use(express.json({ limit: "7mb", strict: true }));
  app.get("/privacy", async (_req, res) => {
    const text = await readFile(
      new URL("../../docs/privacy.md", import.meta.url),
      "utf8",
    );
    const safe = text.replace(
      /[&<>]/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!,
    );
    res
      .type("html")
      .send(
        '<!doctype html><html lang="en"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Changeboard privacy</title><style>body{max-width:720px;margin:64px auto;padding:0 24px;font:17px/1.7 system-ui;color:#171c1c;background:#f7f5f0}pre{white-space:pre-wrap;font:inherit}</style><a href="/">← Changeboard</a><pre>' +
          safe +
          "</pre></html>",
      );
  });
  app.get("/health", (_req, res) =>
    res.json({ ok: true, service: "changeboard" }),
  );
  app.get("/media/:id", async (req, res) => {
    const row = (
      await db.query<{ bytes: Uint8Array; mime: string }>(
        "SELECT bytes,mime FROM assets WHERE id=$1",
        [req.params.id],
      )
    ).rows[0];
    if (!row) {
      res.sendStatus(404);
      return;
    }
    res.setHeader("Cache-Control", "public,max-age=31536000,immutable");
    res.type(row.mime).send(Buffer.from(row.bytes));
  });
  app.use("/api", async (req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    const cookies = Object.fromEntries(
      (req.headers.cookie || "").split(";").map((s) => s.trim().split("=")),
    );
    const token = cookies[cookieName];
    const existing =
      token && /^[A-Za-z0-9_-]{40,80}$/.test(token)
        ? (
            await db.query<{ id: string; user_id: string; csrf: string }>(
              "SELECT id,user_id,csrf FROM sessions WHERE id=$1 AND expires_at>now()",
              [hash(token)],
            )
          ).rows[0]
        : undefined;
    if (existing)
      req.session = {
        id: existing.id,
        userId: existing.user_id,
        csrf: existing.csrf,
      };
    else {
      const raw = randomBytes(32).toString("base64url");
      const id = hash(raw),
        userId = randomUUID(),
        csrf = randomBytes(24).toString("base64url");
      await db.transaction(async (tx) => {
        await tx.query("INSERT INTO users(id) VALUES($1)", [userId]);
        await tx.query(
          "INSERT INTO sessions(id,user_id,csrf,expires_at) VALUES($1,$2,$3,now()+interval '30 days')",
          [id, userId, csrf],
        );
      });
      req.session = { id, userId, csrf };
      res.cookie(cookieName, raw, {
        httpOnly: true,
        sameSite: "lax",
        secure:
          process.env.APP_ORIGIN?.startsWith("https://") ||
          process.env.NODE_ENV === "production",
        maxAge: 30 * 86400000,
        path: "/",
      });
    }
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      const expected = req.session.csrf,
        provided = req.headers["x-csrf-token"];
      const allowed = process.env.APP_ORIGIN || "http://127.0.0.1:4310";
      const origin = req.headers.origin;
      if (
        typeof provided !== "string" ||
        provided.length !== expected.length ||
        !timingSafeEqual(Buffer.from(provided), Buffer.from(expected)) ||
        (origin && origin !== allowed)
      )
        throw new HttpError(
          403,
          "The request could not be verified. Refresh the page and try again.",
        );
    }
    next();
  });
  const respond = async (req: express.Request, res: express.Response) =>
    res.json(await stateFor(db, req.session.userId, req.session.csrf));
  const post = (path: string, fn: (req: express.Request) => Promise<unknown>) =>
    app.post(path, async (req, res) => {
      await fn(req);
      await respond(req, res);
    });
  app.get("/api/state", respond);
  app.get("/api/campaign/receipt", async (req, res) => {
    const c = requireCampaign(await campaignFor(db, req.session.userId));
    res
      .type("text/markdown; charset=utf-8")
      .setHeader(
        "Content-Disposition",
        'attachment; filename="changeboard-repair-report.md"',
      )
      .send(repairReceipt(c));
  });
  post("/api/sample", (req) => startSample(db, req.session.userId));
  post("/api/campaign/select", (req) => {
    const b = z
      .object({
        postIds: z.array(identifier).min(1).max(6),
        announcementId: identifier.optional(),
      })
      .strict()
      .parse(req.body);
    return selectPosts(db, req.session.userId, b.postIds, b.announcementId);
  });
  post("/api/campaign/facts", (req) => {
    const facts = validateSourceFacts(req.body.facts);
    const confirmed = z.boolean().parse(req.body.confirmed);
    const name =
      req.body.name === undefined
        ? undefined
        : z.string().trim().min(1).max(120).parse(req.body.name);
    return mutateCampaign(db, req.session.userId, async (c, tx) => {
      const changed = (
        ["date", "time", "venue", "address", "timezone"] as const
      ).some((key) => c.facts[key] !== facts[key]);
      if (c.revision > 0 && changed)
        throw new HttpError(
          409,
          "Original facts are preserved. Edit the proposed facts to make another change.",
        );
      c.facts = facts;
      c.factsConfirmed = confirmed;
      if (name && c.revision === 0) c.name = name;
      if (c.revision === 0 && changed) {
        c.originalFacts = facts;
        c.proposedFacts = facts;
        for (const p of c.posts) {
          p.baselineFacts = facts;
          p.bindings = suggestBindings(p.snapshot, facts);
        }
        await tx.query(
          "UPDATE fact_revisions SET facts=$2 WHERE campaign_id=$1 AND revision=0",
          [c.id, JSON.stringify(facts)],
        );
      }
      touch(c);
    });
  });
  post("/api/campaign/binding", (req) =>
    updateBinding(db, req.session.userId, req.body),
  );
  post("/api/campaign/propose", async (req) => {
    const facts = validateSourceFacts(req.body.facts);
    await mutateCampaign(db, req.session.userId, async (c, tx) => {
      if (!c.factsConfirmed)
        throw new HttpError(409, "Confirm the current event facts first.");
      c.proposedFacts = facts;
      c.revision++;
      touch(c);
      for (const p of c.posts)
        p.media = {
          revision: c.revision,
          status: "needs_review",
          acknowledged: false,
        };
      c.stage = "review";
      if (c.announcement) {
        const old = c.originalFacts;
        c.correction = {
          announcementId: c.announcement.id,
          channelId: c.announcement.channelId,
          text: `Update for ${c.name}: our event has moved from ${old.date} at ${old.time}, ${old.venue}, to ${facts.date} at ${facts.time}, ${facts.venue}${facts.address ? ", " + facts.address : ""}. All times ${facts.timezone}. Thank you for making plans with us.`,
        };
      }
      await tx.query(
        "INSERT INTO fact_revisions(campaign_id,revision,facts) VALUES($1,$2,$3)",
        [c.id, c.revision, JSON.stringify(facts)],
      );
    });
    await preparePreview(db, req.session.userId);
  });
  post("/api/campaign/schedule", async (req) => {
    const b = z
      .object({ postId: identifier, schedule: scheduleSchema })
      .strict()
      .parse(req.body);
    await mutateCampaign(db, req.session.userId, async (c) => {
      getLinked(c, b.postId).schedule = b.schedule;
      touch(c);
    });
    await preparePreview(db, req.session.userId);
  });
  app.post("/api/assets", async (req, res) => {
    const b = z
      .object({
        data: z.string().max(7000000),
        mime: z.enum(["image/png", "image/jpeg", "image/webp"]),
        altText: z.string().trim().min(1).max(2000),
      })
      .strict()
      .parse(req.body);
    res.json(
      await uploadImage(db, req.session.userId, b.data, b.mime, b.altText),
    );
  });
  post("/api/campaign/media", async (req) => {
    const b = z
      .object({
        postId: identifier,
        status: z.enum(["accurate", "poster", "replacement"]),
        acknowledged: z.boolean(),
        url: z.string().max(2048).optional(),
        altText: z.string().max(2000).optional(),
      })
      .strict()
      .parse(req.body);
    await mutateCampaign(db, req.session.userId, async (c, tx) => {
      const p = getLinked(c, b.postId);
      if (!p.snapshot.assets.length)
        throw new HttpError(400, "There is no existing image to replace.");
      let asset: { url: string; altText: string } | undefined;
      if (b.status === "poster") {
        if (
          p.media.status === "poster" &&
          p.media.revision === c.revision &&
          p.media.url
        )
          asset = { url: p.media.url, altText: p.media.altText || "" };
        else
          asset = await poster(tx, req.session.userId, c.proposedFacts, c.name);
      }
      if (b.status === "replacement") {
        const id = b.url?.match(/^\/media\/([a-f0-9-]+)$/)?.[1];
        const row = id
          ? (
              await tx.query<{ alt_text: string }>(
                "SELECT alt_text FROM assets WHERE id=$1 AND user_id=$2",
                [id, req.session.userId],
              )
            ).rows[0]
          : undefined;
        if (!row)
          throw new HttpError(403, "Choose an image uploaded by this account.");
        asset = { url: b.url!, altText: row.alt_text };
      }
      p.media = {
        revision: c.revision,
        status: b.status,
        acknowledged: b.acknowledged,
        ...asset,
      };
      touch(c);
    });
    await preparePreview(db, req.session.userId);
  });
  post("/api/campaign/preview", (req) => {
    const b = z
      .object({ selectedPostIds: z.array(identifier).max(6).optional() })
      .strict()
      .parse(req.body);
    return preparePreview(db, req.session.userId, b.selectedPostIds);
  });
  post("/api/campaign/apply", (req) => {
    const b = z
      .object({ changeSetId: identifier, revision: z.number().int().min(1) })
      .strict()
      .parse(req.body);
    return enqueueApply(db, req.session.userId, b.changeSetId, b.revision);
  });
  post("/api/campaign/refresh", async (req) => {
    const id = identifier.parse(req.body.postId),
      c = requireCampaign(await campaignFor(db, req.session.userId));
    getLinked(c, id);
    const snapshot = await currentSnapshot(db, req.session.userId, c, id);
    await mutateCampaign(db, req.session.userId, async (current) => {
      if (current.id !== c.id || current.version !== c.version)
        throw new HttpError(
          409,
          "The campaign changed while refreshing. Review the latest workspace first.",
        );
      const p = getLinked(current, id);
      p.snapshot = snapshot;
      p.bindings = suggestBindings(snapshot, p.baselineFacts);
      p.media = {
        revision: current.revision,
        status: "needs_review",
        acknowledged: false,
      };
      touch(current);
      current.stage = "facts";
    });
  });
  post("/api/campaign/next", (req) =>
    mutateCampaign(db, req.session.userId, async (c) => {
      c.facts = c.proposedFacts;
      c.factsConfirmed = true;
      c.stage = "facts";
      touch(c);
    }),
  );
  post("/api/campaign/stage", (req) => {
    const stage = z
      .enum(["choose", "facts", "review", "results"])
      .parse(req.body.stage);
    return mutateCampaign(
      db,
      req.session.userId,
      async (c) => {
        if (stage === "review" && !c.changeSet)
          throw new HttpError(409, "Generate a preview first.");
        c.stage = stage as Stage;
      },
      true,
    );
  });
  post("/api/campaign/reconcile", (req) =>
    worker.reconcile(
      req.session.userId,
      identifier.parse(req.body.operationId),
    ),
  );
  post("/api/campaign/move-to-draft", async (req) => {
    const b = z
      .object({ postId: identifier, confirm: z.boolean() })
      .strict()
      .parse(req.body);
    await preparePreview(db, req.session.userId, [], {
      postId: b.postId,
      kind: "move_to_draft",
    });
  });
  post("/api/campaign/correction", (req) => {
    const b = z
      .object({
        text: z.string().trim().min(1).max(2000),
        channelId: identifier,
        approve: z.boolean(),
      })
      .strict()
      .parse(req.body);
    return enqueueCorrection(
      db,
      req.session.userId,
      b.text,
      b.channelId,
      b.approve,
    );
  });
  post("/api/sample/conflict", async (req) => {
    const id = identifier.parse(req.body.postId),
      c = requireCampaign(await campaignFor(db, req.session.userId));
    if (c.mode !== "sample")
      throw new HttpError(
        403,
        "Simulation controls are only available in sample mode.",
      );
    getLinked(c, id);
    const p = await currentSnapshot(db, req.session.userId, c, id);
    p.text += " Doors open early.";
    await db.query(
      "UPDATE sample_remote SET data=$3 WHERE user_id=$1 AND post_id=$2",
      [req.session.userId, id, JSON.stringify(p)],
    );
  });
  app.get("/api/auth/buffer", async (req, res) =>
    res.redirect(await startOAuth(db, req.session.id)),
  );
  app.get("/api/auth/callback", async (req, res) => {
    try {
      const owner = await finishOAuth(db, req.session.id, req.session.userId, {
        state:
          typeof req.query.state === "string" ? req.query.state : undefined,
        code: typeof req.query.code === "string" ? req.query.code : undefined,
        error:
          typeof req.query.error === "string" ? req.query.error : undefined,
      });
      const raw = randomBytes(32).toString("base64url"),
        id = hash(raw),
        csrf = randomBytes(24).toString("base64url");
      await db.transaction(async (tx) => {
        await tx.query("DELETE FROM sessions WHERE id=$1", [req.session.id]);
        await tx.query(
          "INSERT INTO sessions(id,user_id,csrf,expires_at) VALUES($1,$2,$3,now()+interval '30 days')",
          [id, owner, csrf],
        );
      });
      res.cookie(cookieName, raw, {
        httpOnly: true,
        sameSite: "lax",
        secure: true,
        maxAge: 30 * 86400000,
        path: "/",
      });
      res.redirect("/?connection=connected");
    } catch {
      res.redirect("/?connection=reconnect");
    }
  });
  post("/api/organization", async (req) => {
    const id = identifier.parse(req.body.organizationId),
      conn = await getConnection(db, req.session.userId);
    if (!conn.organizations.some((o) => o.id === id))
      throw new HttpError(
        403,
        "Choose an organization available to your account.",
      );
    const client = await clientFor(db, req.session.userId);
    // Explicit selection also refreshes access after a channel is connected in Buffer.
    const channels = await client.channels(id, true);
    await db.transaction(async (tx) => {
      const fresh = await jsonRow<import("./connections").Connection>(
        tx,
        "SELECT data FROM connections WHERE user_id=$1 FOR UPDATE",
        [req.session.userId],
      );
      if (!fresh || fresh.status !== "connected")
        throw new HttpError(
          401,
          "Reconnect Buffer before selecting the organization.",
        );
      fresh.channels = channels;
      fresh.organizationId = id;
      await saveConnection(tx, req.session.userId, fresh);
    });
  });
  app.post("/api/import", async (req, res) => {
    const b = z
      .object({
        channelId: identifier.optional(),
        status: z.enum(["draft", "scheduled", "sent"]).optional(),
        after: z.string().max(1000).optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
      })
      .strict()
      .parse(req.body);
    const conn = await getConnection(db, req.session.userId);
    if (!conn.organizationId)
      throw new HttpError(400, "Choose your organization first.");
    const channelIds = b.channelId
      ? [b.channelId]
      : conn.channels.slice(0, 6).map((c) => c.id);
    if (!channelIds.length)
      throw new HttpError(400, "No channels are available to this account.");
    if (channelIds.some((id) => !conn.channels.some((c) => c.id === id)))
      throw new HttpError(403, "Choose an available channel.");
    const client = await clientFor(db, req.session.userId);
    const initialCampaign = await campaignFor(db, req.session.userId);
    const page = await client.listPosts({
      organizationId: conn.organizationId!,
      channelIds,
      statuses: b.status ? [b.status] : ["draft", "scheduled", "sent"],
      first: 20,
      after: b.after,
      startDate: b.dateFrom ? new Date(b.dateFrom).toISOString() : undefined,
      endDate: b.dateTo
        ? new Date(b.dateTo + "T23:59:59Z").toISOString()
        : undefined,
    });
    await db.transaction(async (tx) => {
      const owner = (
        await tx.query<{ active_campaign_id: string | null }>(
          "SELECT active_campaign_id FROM users WHERE id=$1 FOR UPDATE",
          [req.session.userId],
        )
      ).rows[0];
      let c = owner?.active_campaign_id
        ? await jsonRow<Campaign>(
            tx,
            "SELECT data FROM campaigns WHERE id=$1 AND user_id=$2 FOR UPDATE",
            [owner.active_campaign_id, req.session.userId],
          )
        : undefined;
      if (
        c?.id !== initialCampaign?.id ||
        c?.version !== initialCampaign?.version
      )
        throw new HttpError(
          409,
          "The workspace changed while importing. Refresh your posts again.",
        );
      const latestConnection = await getConnection(tx, req.session.userId);
      if (
        latestConnection.status !== "connected" ||
        latestConnection.organizationId !== conn.organizationId
      )
        throw new HttpError(
          409,
          "The connection or organization changed while importing. Choose it again.",
        );
      if (!c || c.mode !== "live" || c.organizationId !== conn.organizationId) {
        const restored = await jsonRow<Campaign>(
          tx,
          "SELECT data FROM campaigns WHERE user_id=$1 AND data->>'mode'='live' AND data->>'organizationId'=$2 ORDER BY updated_at DESC LIMIT 1 FOR UPDATE",
          [req.session.userId, conn.organizationId],
        );
        if (restored) c = restored;
      }
      if (
        c &&
        (
          await tx.query(
            "SELECT id FROM operations WHERE campaign_id=$1 AND status IN ('pending','running') LIMIT 1",
            [c.id],
          )
        ).rows.length
      )
        throw new HttpError(
          409,
          "Updates are running. Wait for their results before importing again.",
        );
      if (!c || c.mode !== "live" || c.organizationId !== conn.organizationId) {
        const facts: Facts = {
          date: new Date().toISOString().slice(0, 10),
          time: "18:00",
          venue: "",
          address: "",
          timezone: conn.channels[0]?.timezone || "UTC",
        };
        c = {
          id: randomUUID(),
          name: "Your event campaign",
          mode: "live",
          organizationId: conn.organizationId!,
          organizationName:
            conn.organizations.find((o) => o.id === conn.organizationId)
              ?.name || "",
          stage: "choose",
          version: 1,
          revision: 0,
          originalFacts: facts,
          facts,
          proposedFacts: facts,
          factsConfirmed: false,
          posts: [],
          availablePosts: [],
          operations: [],
          createdAt: new Date().toISOString(),
        };
        await saveCampaign(tx, req.session.userId, c);
        await tx.query("UPDATE users SET active_campaign_id=$2 WHERE id=$1", [
          req.session.userId,
          c.id,
        ]);
        await tx.query(
          "INSERT INTO fact_revisions(campaign_id,revision,facts) VALUES($1,0,$2)",
          [c.id, JSON.stringify(facts)],
        );
      }
      const imported = page.posts.map(normalizePost);
      c.availablePosts = [
        ...new Map(
          [...(b.after ? c.availablePosts : []), ...imported].map((p) => [
            p.id,
            p,
          ]),
        ).values(),
      ].slice(-100);
      c.stage = "choose";
      touch(c);
      await saveCampaign(tx, req.session.userId, c);
      await tx.query("UPDATE users SET active_campaign_id=$2 WHERE id=$1", [
        req.session.userId,
        c.id,
      ]);
    });
    res.json({
      ...(await stateFor(db, req.session.userId, req.session.csrf)),
      nextCursor: page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null,
    });
  });
  post("/api/disconnect", async (req) => {
    await saveConnection(db, req.session.userId, emptyConnection());
  });
  app.delete("/api/data", async (req, res) => {
    await db.transaction(async (tx) => {
      await tx.query("SELECT id FROM campaigns WHERE user_id=$1 FOR UPDATE", [
        req.session.userId,
      ]);
      const active = (
        await tx.query(
          "SELECT id FROM operations WHERE user_id=$1 AND status IN ('pending','running') LIMIT 1",
          [req.session.userId],
        )
      ).rows;
      if (active.length)
        throw new HttpError(
          409,
          "Wait for running operations before deleting local data.",
        );

      await tx.query("DELETE FROM connections WHERE user_id=$1", [
        req.session.userId,
      ]);
      await tx.query("DELETE FROM campaigns WHERE user_id=$1", [
        req.session.userId,
      ]);
      await tx.query("DELETE FROM sample_remote WHERE user_id=$1", [
        req.session.userId,
      ]);
      await tx.query("DELETE FROM assets WHERE user_id=$1 AND retained=false", [
        req.session.userId,
      ]);
      await tx.query("UPDATE assets SET user_id=NULL WHERE user_id=$1", [
        req.session.userId,
      ]);
      await tx.query(
        "UPDATE users SET active_campaign_id=NULL,buffer_user_id=NULL WHERE id=$1",
        [req.session.userId],
      );
      await tx.query("UPDATE sessions SET oauth=NULL WHERE user_id=$1", [
        req.session.userId,
      ]);
    });
    await respond(req, res);
  });
  app.use("/api", (_req, _res, next) =>
    next(new HttpError(404, "This action does not exist.")),
  );
  app.use(
    (
      error: unknown,
      _req: express.Request,
      res: express.Response,
      next: express.NextFunction,
    ) => {
      if (res.headersSent) {
        next(error);
        return;
      }
      const status =
        error instanceof HttpError
          ? error.status
          : error instanceof z.ZodError
            ? 400
            : error instanceof BufferApiError
              ? error.kind === "authentication"
                ? 401
                : error.kind === "rate_limit"
                  ? 429
                  : 502
              : 400;
      if (error instanceof BufferApiError && error.retryAfterSeconds)
        res.setHeader("Retry-After", String(error.retryAfterSeconds));
      const message =
        error instanceof z.ZodError
          ? error.issues.map((i) => i.message).join(" ")
          : error instanceof Error
            ? error.message
            : "Something went wrong. Please try again.";
      res.status(status).json({ error: message });
    },
  );
  return app;
}

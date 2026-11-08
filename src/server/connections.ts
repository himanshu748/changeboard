import {
  BufferClient,
  BufferApiError,
  createOAuthAttempt,
  validateOAuthCallback,
  validateOAuthState,
  exchangeCode,
  refreshTokens,
  encryptTokens,
  decryptTokens,
  unsupportedReason,
  LiveFormatEvidenceSchema,
} from "../buffer";
import type {
  BufferChannel,
  BufferPost,
  TokenPair,
  OAuthAttempt,
  LiveFormatEvidence,
  ApiReceipt,
} from "../buffer";
import type { AppState, Snapshot } from "../shared";
import type { Database, Sql } from "./db";
import { jsonRow } from "./db";
import { readFile } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
export interface Connection {
  encrypted?: string;
  status: AppState["connection"]["status"];
  organizations: { id: string; name: string }[];
  channels: BufferChannel[];
  organizationId?: string;
  bufferUserId?: string;
  message?: string;
  rateLimitUntil?: number;
  lastRateLimit?: string;
  apiReceipts?: ApiReceipt[];
}
interface CachedClient {
  client: BufferClient;
  tokenDigest: string;
  evidenceDigest: string;
  usedAt: number;
}
// Per database and owner: cached discovery never crosses users, databases or OAuth grants.
const caches = new WeakMap<Database, Map<string, CachedClient>>();
function clientCache(db: Database) {
  let cache = caches.get(db);
  if (!cache) {
    cache = new Map();
    caches.set(db, cache);
  }
  return cache;
}
async function checkCooldown(db: Sql) {
  const row = (
    await db.query<{ deadline: number | string | null }>(
      "SELECT MAX(NULLIF(data->>'rateLimitUntil','')::double precision) AS deadline FROM connections",
    )
  ).rows[0];
  const deadline = Number(row?.deadline || 0);
  if (deadline > Date.now())
    throw new BufferApiError(
      "Buffer is rate limited. Wait before refreshing.",
      "rate_limit",
      false,
      Math.ceil((deadline - Date.now()) / 1000),
    );
}
export function oauthConfig() {
  return {
    clientId: process.env.BUFFER_CLIENT_ID || "",
    clientSecret: process.env.BUFFER_CLIENT_SECRET,
    redirectUri: process.env.BUFFER_REDIRECT_URI || "",
  };
}
export function configured() {
  return Boolean(
    process.env.BUFFER_CLIENT_ID &&
    process.env.BUFFER_REDIRECT_URI &&
    process.env.TOKEN_ENCRYPTION_KEY,
  );
}
export const emptyConnection = (): Connection => ({
  status: "not_connected",
  organizations: [],
  channels: [],
});
export async function getConnection(db: Sql, userId: string) {
  return (
    (await jsonRow<Connection>(
      db,
      "SELECT data FROM connections WHERE user_id=$1",
      [userId],
    )) || emptyConnection()
  );
}
export async function saveConnection(
  db: Sql,
  userId: string,
  c: Connection,
  preserveOperationalFields = true,
) {
  const update = preserveOperationalFields
    ? `$2::jsonb || jsonb_strip_nulls(jsonb_build_object('rateLimitUntil',GREATEST(COALESCE((connections.data->>'rateLimitUntil')::double precision,0),COALESCE(($2::jsonb->>'rateLimitUntil')::double precision,0)),'lastRateLimit',connections.data->'lastRateLimit','apiReceipts',connections.data->'apiReceipts'))`
    : "$2::jsonb";
  await db.query(
    `INSERT INTO connections(user_id,data) VALUES($1,$2) ON CONFLICT(user_id) DO UPDATE SET data=${update}`,
    [userId, JSON.stringify(c)],
  );
}
export async function liveEvidence(): Promise<LiveFormatEvidence[]> {
  if (!process.env.LIVE_FORMAT_EVIDENCE_FILE) return [];
  const raw: unknown = JSON.parse(
    await readFile(process.env.LIVE_FORMAT_EVIDENCE_FILE, "utf8"),
  );
  if (!Array.isArray(raw))
    throw new Error("Live format evidence must be an array.");
  return raw.flatMap((entry) => {
    const parsed = LiveFormatEvidenceSchema.safeParse(entry);
    return parsed.success ? [parsed.data] : [];
  });
}
async function recordReceipt(
  db: Database,
  userId: string,
  receipt: ApiReceipt,
  tokenDigest: string,
) {
  await db.transaction(async (tx) => {
    const c = await jsonRow<Connection>(
      tx,
      "SELECT data FROM connections WHERE user_id=$1 FOR UPDATE",
      [userId],
    );
    if (!c) return;
    // A short owner-scoped receipt history is private application data, never console logging.
    c.apiReceipts = [...(c.apiReceipts || []), receipt].slice(-12);
    c.lastRateLimit = receipt.rateLimit;
    if (receipt.httpStatus === 429)
      c.rateLimitUntil = Date.now() + (receipt.retryAfterSeconds ?? 60) * 1000;
    if (receipt.httpStatus === 401 && c.encrypted) {
      // A late 401 from an old in-flight request must not invalidate a newly rotated/reconnected grant.
      let activeDigest: string | undefined;
      try {
        activeDigest = createHash("sha256")
          .update(
            decryptTokens(
              c.encrypted,
              process.env.TOKEN_ENCRYPTION_KEY || "",
              userId,
            ).accessToken,
          )
          .digest("hex");
      } catch {
        /* clientFor reports an unreadable credential record */
      }
      if (activeDigest === tokenDigest) {
        c.status = "revoked";
        c.message =
          "Buffer access expired or was revoked. Reconnect to continue.";
        delete c.encrypted;
        clientCache(db).delete(userId);
      }
    }
    await saveConnection(tx, userId, c, false);
  });
}
// PostgreSQL row lock covers the single-use refresh exchange and atomic replacement pair.
export async function clientFor(
  db: Database,
  userId: string,
): Promise<BufferClient> {
  // Buffer rate limits are app-client-wide. Persist the deadline and inspect all owners so
  // another browser/user or a server restart cannot immediately replay a throttled request.
  await checkCooldown(db);
  const outcome = await db.transaction(async (tx) => {
    const c = await jsonRow<Connection>(
      tx,
      "SELECT data FROM connections WHERE user_id=$1 FOR UPDATE",
      [userId],
    );
    if (!c?.encrypted || c.status !== "connected")
      return { error: "Connect Buffer to continue." };
    let tokens: TokenPair;
    try {
      tokens = decryptTokens(
        c.encrypted,
        process.env.TOKEN_ENCRYPTION_KEY || "",
        userId,
      );
      if (tokens.expiresAt < Date.now() + 60000) {
        tokens = await refreshTokens(oauthConfig(), tokens.refreshToken);
        c.encrypted = encryptTokens(
          tokens,
          process.env.TOKEN_ENCRYPTION_KEY || "",
          userId,
        );
        await saveConnection(tx, userId, c);
      }
    } catch {
      c.status = "expired";
      c.message =
        "Your Buffer connection expired or was revoked. Reconnect to continue.";
      delete c.encrypted;
      await saveConnection(tx, userId, c);
      clientCache(db).delete(userId);
      return { error: c.message };
    }
    return { tokens };
  });
  if (!outcome.tokens)
    throw new BufferApiError(
      outcome.error || "Reconnect Buffer.",
      "authentication",
    );
  const verifiedFormats = await liveEvidence();
  const tokenDigest = createHash("sha256")
    .update(outcome.tokens.accessToken)
    .digest("hex");
  const evidenceDigest = createHash("sha256")
    .update(JSON.stringify(verifiedFormats))
    .digest("hex");
  const cache = clientCache(db),
    cached = cache.get(userId);
  if (
    cached?.tokenDigest === tokenDigest &&
    cached.evidenceDigest === evidenceDigest
  ) {
    cached.usedAt = Date.now();
    return cached.client;
  }
  // Bound dormant instances; encrypted credentials remain the source of truth on each call.
  for (const [id, entry] of cache)
    if (Date.now() - entry.usedAt > 30 * 60_000) cache.delete(id);
  if (cache.size >= 100) cache.delete(cache.keys().next().value!);
  const client = new BufferClient({
    accessToken: outcome.tokens.accessToken,
    verifiedFormats,
    onReceipt: (receipt) => recordReceipt(db, userId, receipt, tokenDigest),
  });
  cache.set(userId, {
    client,
    tokenDigest,
    evidenceDigest,
    usedAt: Date.now(),
  });
  return client;
}
export async function startOAuth(db: Sql, sessionId: string) {
  if (!configured())
    throw new Error(
      "Configure BUFFER_CLIENT_ID, BUFFER_REDIRECT_URI and TOKEN_ENCRYPTION_KEY.",
    );
  const attempt = createOAuthAttempt(oauthConfig());
  await db.query("UPDATE sessions SET oauth=$2 WHERE id=$1", [
    sessionId,
    JSON.stringify(attempt),
  ]);
  return attempt.url;
}
export async function finishOAuth(
  db: Database,
  sessionId: string,
  userId: string,
  query: { state?: string; code?: string; error?: string },
) {
  // A forged callback must neither consume a legitimate in-flight attempt nor erase an existing connection.
  const attempt = await db.transaction(async (tx) => {
    const row = (
      await tx.query<{ oauth: OAuthAttempt }>(
        "SELECT oauth FROM sessions WHERE id=$1 AND user_id=$2 FOR UPDATE",
        [sessionId, userId],
      )
    ).rows[0];
    validateOAuthState(row?.oauth, query.state);
    await tx.query(
      "UPDATE sessions SET oauth=NULL WHERE id=$1 AND user_id=$2",
      [sessionId, userId],
    );
    return row!.oauth;
  });
  const previous = await getConnection(db, userId);
  const receipts: ApiReceipt[] = [];
  try {
    const code = validateOAuthCallback(attempt, query);
    await checkCooldown(db);
    const tokens = await exchangeCode(oauthConfig(), code, attempt!.verifier);
    const client = new BufferClient({
      accessToken: tokens.accessToken,
      onReceipt: (r) => {
        receipts.push(r);
      },
    });
    const account = await client.account();
    // The token-proven Buffer identity owns live resources. Connecting a different account
    // switches this session to a distinct local owner; it never exposes the previous campaign.
    const ownerId = await db.transaction(async (tx) => {
      await tx.query(
        "INSERT INTO users(id,buffer_user_id) VALUES($1,$2) ON CONFLICT(buffer_user_id) DO NOTHING",
        [randomUUID(), account.id],
      );
      const owner = (
        await tx.query<{ id: string }>(
          "SELECT id FROM users WHERE buffer_user_id=$1 FOR UPDATE",
          [account.id],
        )
      ).rows[0];
      if (!owner)
        throw new Error("Could not establish the connected account owner.");
      const prior = await getConnection(tx, owner.id);
      const accessible =
        prior.organizationId &&
        account.organizations.some((org) => org.id === prior.organizationId);
      await saveConnection(
        tx,
        owner.id,
        {
          encrypted: encryptTokens(
            tokens,
            process.env.TOKEN_ENCRYPTION_KEY || "",
            owner.id,
          ),
          status: "connected",
          organizations: account.organizations,
          channels: accessible ? prior.channels : [],
          organizationId: accessible ? prior.organizationId : undefined,
          bufferUserId: account.id,
          rateLimitUntil:
            Math.max(previous.rateLimitUntil || 0, prior.rateLimitUntil || 0) ||
            undefined,
          apiReceipts: [...(prior.apiReceipts || []), ...receipts].slice(-12),
        },
        false,
      );
      await tx.query("UPDATE sessions SET user_id=$2 WHERE id=$1", [
        sessionId,
        owner.id,
      ]);
      return owner.id;
    });
    clientCache(db).delete(userId);
    clientCache(db).delete(ownerId);
    return ownerId;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Connection failed.";
    const limited = receipts.find((r) => r.httpStatus === 429);
    if (limited)
      previous.rateLimitUntil =
        Date.now() + (limited.retryAfterSeconds ?? 60) * 1000;
    // Denying a new consent must not revoke a still-working previously connected grant.
    if (previous.status === "connected" && previous.encrypted)
      await saveConnection(db, userId, { ...previous, message });
    else
      await saveConnection(db, userId, {
        ...emptyConnection(),
        status: query.error === "access_denied" ? "denied" : "expired",
        rateLimitUntil: previous.rateLimitUntil,
        message,
      });
    throw error;
  }
}
export function normalizePost(p: BufferPost): Snapshot {
  const reason = unsupportedReason(p);
  return {
    id: p.id,
    text: p.text,
    channelId: p.channelId,
    channelName: p.channel.displayName || p.channel.name,
    service: p.channelService,
    status: p.status,
    scheduledAt: p.dueAt,
    mode:
      p.status === "draft"
        ? "draft"
        : p.isCustomScheduled && p.shareMode === "customScheduled"
          ? "customScheduled"
          : "queue",
    assets: p.assets.map((a) => ({
      id: a.id || undefined,
      url: a.source,
      type: a.type.toLowerCase(),
      altText: a.image?.altText,
      metadata: {
        mimeType: a.mimeType,
        userTags: a.image?.userTags,
        isAnimated: a.image?.isAnimated,
        width: a.image?.width,
        height: a.image?.height,
      },
    })),
    metadata: {
      bufferMetadata: p.metadata,
      tags: p.tags,
      schedulingType: p.schedulingType,
      shareMode: p.shareMode,
      format: p.metadata?.type,
      channelType: p.channel.type,
      channelLocked: p.channel.isLocked,
      channelDisconnected: p.channel.isDisconnected,
      channelQueuePaused: p.channel.isQueuePaused,
      channelAllowedActions: p.channel.allowedActions,
      ...(reason ? { unsupportedReason: reason } : {}),
    },
    allowedActions: p.allowedActions,
    channelTimezone: p.channel.timezone,
    structuredMentions: Boolean(
      p.metadata?.annotations?.some(
        (a) => !["url", "hashtag", "cashtag"].includes(a.type),
      ),
    ),
  };
}

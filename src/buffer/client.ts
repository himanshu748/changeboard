import { z } from "zod";
import {
  ACCOUNT_QUERY,
  CHANNELS_QUERY,
  POST_QUERY,
  POSTS_QUERY,
  EDIT_POST_MUTATION,
  CREATE_POST_MUTATION,
} from "./queries";
import {
  BufferAccountSchema,
  BufferChannelSchema,
  BufferPostSchema,
  BufferApiError,
  type ApiReceipt,
  type BufferAccount,
  type BufferChannel,
  type BufferPost,
  type NarrowPostEdit,
  type PostListOptions,
  type ReplacementImage,
  type LiveFormatEvidence,
} from "./types";

export interface BufferClientOptions {
  accessToken: string;
  fetch?: typeof fetch;
  now?: () => number;
  onReceipt?: (receipt: ApiReceipt) => void | Promise<void>;
  verifiedFormats?: LiveFormatEvidence[];
}

const imageSchema = z
  .object({
    url: z.string().url(),
    altText: z.string().trim().min(1).max(2000),
    userTags: z
      .array(
        z
          .object({
            handle: z.string().min(1),
            x: z.number().min(0).max(1),
            y: z.number().min(0).max(1),
          })
          .strict(),
      )
      .optional(),
  })
  .strict();
const editSchema = z
  .object({
    text: z.string().min(1).max(50_000).optional(),
    fixedScheduledAt: z.string().datetime().optional(),
    replacementImage: imageSchema.optional(),
    moveToDraft: z.literal(true).optional(),
  })
  .strict()
  .refine(
    (value) => Object.keys(value).length > 0,
    "Empty changes are not permitted",
  )
  .refine(
    (value) => !(value.moveToDraft && value.fixedScheduledAt),
    "A draft cannot also be scheduled",
  );
const listSchema = z
  .object({
    organizationId: z.string().min(1),
    channelIds: z.array(z.string().min(1)).min(1).max(6),
    statuses: z
      .array(
        z.enum([
          "draft",
          "error",
          "needs_approval",
          "scheduled",
          "sending",
          "sent",
        ]),
      )
      .min(1),
    first: z.number().int().min(1).max(50).default(20),
    after: z.string().max(1000).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  })
  .strict()
  .refine(
    (value) =>
      !value.startDate || !value.endDate || value.startDate <= value.endDate,
    "Invalid date range",
  );

export function formatKey(
  channel: Pick<BufferChannel, "service" | "type">,
  image: boolean,
): string {
  return `${channel.service}:${channel.type}:${image ? "single-image" : "text"}`;
}

/** Honest preflight reasons; no live capability is enabled merely because a schema documents it. */
export function unsupportedReason(post: BufferPost): string | undefined {
  if (
    post.channel.service !== "facebook" &&
    post.channel.service !== "instagram"
  )
    return "Only Facebook Page and Instagram professional-account channels are in this MVP.";
  if (post.channel.service === "facebook" && post.channel.type !== "page")
    return "Only Facebook Page channels are supported.";
  if (
    post.channel.service === "instagram" &&
    !["business", "account"].includes(post.channel.type)
  )
    return "This Instagram account type has not been enabled.";
  if (post.channel.isDisconnected || post.channel.isLocked)
    return "This channel is disconnected or locked in Buffer.";
  if (post.schedulingType !== "automatic")
    return "Notification publishing needs separate manual review and is not enabled.";
  if (!post.metadata || !post.metadata.type || !post.metadata.annotations)
    return "The post metadata could not be verified.";
  if (post.metadata.type !== "post")
    return "Only ordinary posts are supported; stories, reels and threads are excluded.";
  if (
    post.metadata.annotations.some(
      (annotation) => !["url", "hashtag", "cashtag"].includes(annotation.type),
    )
  )
    return "Structured mentions or text annotations are not supported.";
  if (post.metadata.linkAttachment)
    return "Link-card posts are not supported by this repair flow.";
  if (
    post.assets.length > 1 ||
    post.assets.some(
      (asset) =>
        asset.type !== "image" || !asset.image || asset.image.isAnimated,
    )
  )
    return "Only text and single static-image posts are supported.";
  if (post.channel.service === "instagram" && post.assets.length !== 1)
    return "Instagram requires a supported single image for this workflow.";
  if (post.status === "needs_approval")
    return "This post is awaiting approval; repair it through the existing Buffer approval flow.";
  return undefined;
}

/** Smallest edit payload. Unspecified assets, metadata, tags, approval and publishing type stay omitted. */
export function narrowEditInput(
  id: string,
  value: NarrowPostEdit,
): Record<string, unknown> {
  const edit = editSchema.parse(value);
  const input: Record<string, unknown> = { id };
  if (edit.text !== undefined) input.text = edit.text;
  if (edit.fixedScheduledAt !== undefined) {
    input.mode = "customScheduled";
    input.dueAt = edit.fixedScheduledAt;
  }
  if (edit.moveToDraft) input.saveToDraft = true;
  if (edit.replacementImage) input.assets = [imageInput(edit.replacementImage)];
  return input;
}

function imageInput(image: ReplacementImage) {
  const parsed = imageSchema.parse(image);
  const url = new URL(parsed.url);
  if (url.protocol !== "https:" || url.username || url.password || url.hash)
    throw new Error("Replacement media requires a stable public HTTPS URL.");
  if (["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))
    throw new Error("Buffer cannot fetch localhost media.");
  return {
    image: {
      url: parsed.url,
      metadata: { altText: parsed.altText, userTags: parsed.userTags ?? [] },
    },
  };
}

function retryAfter(response: Response, now: number): number | undefined {
  const header = response.headers.get("retry-after");
  if (!header) return undefined;
  const numeric = Number(header);
  if (Number.isFinite(numeric) && numeric >= 0) return Math.ceil(numeric);
  const instant = Date.parse(header);
  return Number.isFinite(instant)
    ? Math.max(0, Math.ceil((instant - now) / 1000))
    : undefined;
}

export class BufferClient {
  private fetcher: typeof fetch;
  private now: () => number;
  private notBefore = 0;
  private accountCache?: { value: BufferAccount; expires: number };
  private channelCache = new Map<
    string,
    { value: BufferChannel[]; expires: number }
  >();

  constructor(private readonly options: BufferClientOptions) {
    if (!options.accessToken)
      throw new Error("An OAuth access token is required.");
    this.fetcher = options.fetch ?? fetch;
    this.now = options.now ?? Date.now;
  }

  /** Revoke/reconnect replaces this instance; access tokens never enter receipts. */
  async account(refresh = false): Promise<BufferAccount> {
    if (!refresh && this.accountCache && this.accountCache.expires > this.now())
      return this.accountCache.value;
    const data = await this.request("account", ACCOUNT_QUERY, {}, "read");
    const value = this.parse(BufferAccountSchema, data.account, false);
    this.accountCache = { value, expires: this.now() + 5 * 60_000 };
    return value;
  }

  async channels(
    organizationId: string,
    refresh = false,
  ): Promise<BufferChannel[]> {
    const account = await this.account(refresh);
    if (
      !account.organizations.some(
        (organization) => organization.id === organizationId,
      )
    ) {
      throw new BufferApiError(
        "This organization is not available to the connected account.",
        "authentication",
      );
    }
    const cached = this.channelCache.get(organizationId);
    if (!refresh && cached && cached.expires > this.now()) return cached.value;
    const data = await this.request(
      "channels",
      CHANNELS_QUERY,
      { input: { organizationId } },
      "read",
    );
    const value = this.parse(
      z.array(BufferChannelSchema),
      data.channels,
      false,
    );
    if (value.some((channel) => channel.organizationId !== organizationId))
      throw new BufferApiError(
        "Buffer returned a channel for an unexpected organization.",
        "schema",
      );
    this.channelCache.set(organizationId, {
      value,
      expires: this.now() + 5 * 60_000,
    });
    return value;
  }

  async listPosts(options: PostListOptions): Promise<{
    posts: BufferPost[];
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
  }> {
    const parsed = listSchema.parse(options);
    const channels = await this.channels(parsed.organizationId);
    if (
      parsed.channelIds.some(
        (id) => !channels.some((channel) => channel.id === id),
      )
    ) {
      throw new BufferApiError(
        "One of the selected channels is not available in this organization.",
        "authentication",
      );
    }
    const filter = {
      channelIds: parsed.channelIds,
      status: parsed.statuses,
      ...(parsed.startDate ? { startDate: parsed.startDate } : {}),
      ...(parsed.endDate ? { endDate: parsed.endDate } : {}),
    };
    const variables = {
      input: { organizationId: parsed.organizationId, filter },
      first: parsed.first,
      ...(parsed.after ? { after: parsed.after } : {}),
    };
    const data = await this.request("posts", POSTS_QUERY, variables, "read");
    const result = this.parse(
      z.object({
        edges: z.array(z.object({ node: BufferPostSchema })).nullable(),
        pageInfo: z.object({
          hasNextPage: z.boolean(),
          endCursor: z.string().nullable(),
        }),
      }),
      data.posts,
      false,
    );
    const posts = (result.edges ?? []).map((edge) => edge.node);
    if (
      posts.some(
        (post) =>
          post.channel.organizationId !== parsed.organizationId ||
          !parsed.channelIds.includes(post.channelId),
      )
    ) {
      throw new BufferApiError(
        "Buffer returned a post outside the selected organization or channels.",
        "schema",
      );
    }
    return { posts, pageInfo: result.pageInfo };
  }

  async post(id: string): Promise<BufferPost> {
    const data = await this.request(
      "post",
      POST_QUERY,
      { input: { id } },
      "read",
    );
    const post = this.parse(BufferPostSchema, data.post, false);
    if (post.id !== id)
      throw new BufferApiError("Buffer returned the wrong post.", "schema");
    return post;
  }

  /** The executor must re-fetch `current`, compare approved snapshots and cutoff, and persist running first. */
  async editPost(
    current: BufferPost,
    edit: NarrowPostEdit,
  ): Promise<BufferPost> {
    const reason = unsupportedReason(current);
    if (reason) throw new BufferApiError(reason, "unsupported");
    this.assertLiveFormat(current.channel, current.assets.length > 0);
    if (edit.replacementImage) this.assertLiveFormat(current.channel, true);
    if (!["draft", "scheduled"].includes(current.status))
      throw new BufferApiError(
        "Only draft or scheduled posts can be repaired.",
        "unsupported",
      );
    if (!current.allowedActions.includes("updatePost"))
      throw new BufferApiError(
        "Buffer does not permit editing this post.",
        "authentication",
      );
    if (
      edit.fixedScheduledAt &&
      !current.allowedActions.includes("updatePostSchedule")
    )
      throw new BufferApiError(
        "Buffer does not permit rescheduling this post.",
        "authentication",
      );
    if (edit.moveToDraft && !current.allowedActions.includes("movePostToDraft"))
      throw new BufferApiError(
        "Buffer does not permit moving this post to draft.",
        "authentication",
      );
    const data = await this.request(
      "editPost",
      EDIT_POST_MUTATION,
      { input: narrowEditInput(current.id, edit) },
      "write",
    );
    return this.mutationPost(data.editPost);
  }

  async createCorrectionDraft(
    channel: BufferChannel,
    value: { text: string; image?: ReplacementImage },
  ): Promise<BufferPost> {
    const parsed = z
      .object({
        text: z
          .string()
          .min(1)
          .max(50_000)
          .refine((text) => text.trim().length > 0),
        image: imageSchema.optional(),
      })
      .strict()
      .parse(value);
    if (
      channel.isDisconnected ||
      channel.isLocked ||
      !channel.allowedActions.includes("manageUpdates")
    ) {
      throw new BufferApiError(
        "Buffer does not permit creating a draft on this channel.",
        "authentication",
      );
    }
    this.assertLiveFormat(channel, !!parsed.image);
    if (channel.service === "instagram" && !parsed.image)
      throw new BufferApiError(
        "An Instagram correction draft requires a reviewed image.",
        "unsupported",
      );
    const input = {
      channelId: channel.id,
      text: parsed.text,
      assets: parsed.image ? [imageInput(parsed.image)] : [],
      mode: "addToQueue",
      schedulingType: "automatic",
      saveToDraft: true,
      needsApproval: false,
    };
    const data = await this.request(
      "createPost",
      CREATE_POST_MUTATION,
      { input },
      "write",
    );
    const post = this.mutationPost(data.createPost);
    if (
      post.status !== "draft" ||
      post.channelId !== channel.id ||
      post.text !== parsed.text
    ) {
      throw new BufferApiError(
        "Buffer returned a correction with unexpected content, destination or status. Reconcile before retrying.",
        "schema",
        true,
      );
    }
    return post;
  }

  private assertLiveFormat(channel: BufferChannel, image: boolean) {
    if (
      !(channel.service === "facebook" && channel.type === "page") &&
      !(
        channel.service === "instagram" &&
        ["business", "account"].includes(channel.type)
      )
    ) {
      throw new BufferApiError(
        "This channel type is outside the supported MVP.",
        "unsupported",
      );
    }
    const key = formatKey(channel, image);
    if (
      !this.options.verifiedFormats?.some(
        (evidence) =>
          evidence.key === key &&
          evidence.receiptId &&
          Number.isFinite(Date.parse(evidence.verifiedAt)),
      )
    ) {
      throw new BufferApiError(
        `Live ${key} writes are not enabled: a dated live-test receipt is required.`,
        "unsupported",
      );
    }
  }

  private parse<T>(schema: z.ZodType<T>, value: unknown, write: boolean): T {
    const result = schema.safeParse(value);
    if (!result.success)
      throw new BufferApiError(
        "Buffer returned an unexpected response shape; review the API contract.",
        "schema",
        write,
      );
    return result.data;
  }

  private mutationPost(value: unknown): BufferPost {
    const envelope = this.parse(
      z.object({
        __typename: z.string(),
        post: z.unknown().optional(),
        message: z.string().optional(),
      }),
      value,
      true,
    );
    if (envelope.__typename !== "PostActionSuccess") {
      // Error variants implement MutationError. Unknown variants without a message remain ambiguous.
      if (!envelope.message)
        throw new BufferApiError(
          "Buffer returned an unrecognized mutation outcome. Check remote state.",
          "schema",
          true,
        );
      throw new BufferApiError(
        `Buffer rejected this operation: ${envelope.message.slice(0, 500)}`,
        "mutation",
      );
    }
    return this.parse(BufferPostSchema, envelope.post, true);
  }

  private async request(
    operation: string,
    query: string,
    variables: Record<string, unknown>,
    kind: "read" | "write",
  ): Promise<Record<string, unknown>> {
    if (this.notBefore > this.now())
      throw new BufferApiError(
        "Buffer is rate limited. Wait before refreshing.",
        "rate_limit",
        false,
        Math.ceil((this.notBefore - this.now()) / 1000),
      );
    const receipt: ApiReceipt = {
      at: new Date(this.now()).toISOString(),
      operation,
      kind,
      request: { query, variables },
      outcome: "transport_error",
    };
    let response: Response;
    try {
      response = await this.fetcher("https://api.buffer.com", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.options.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query, variables }),
        signal: AbortSignal.timeout(15_000),
        redirect: "error",
      });
    } catch {
      await this.emitReceipt(receipt);
      throw new BufferApiError(
        kind === "write"
          ? "The response was lost. The operation may have applied; reconcile before retrying."
          : "Buffer could not be reached. Try a deliberate refresh later.",
        "transport",
        kind === "write",
      );
    }
    const seconds = retryAfter(response, this.now());
    receipt.httpStatus = response.status;
    receipt.rateLimit = response.headers.get("ratelimit") ?? undefined;
    receipt.retryAfterSeconds = seconds;
    receipt.outcome = "response";
    let raw: unknown;
    try {
      raw = await response.json();
    } catch {
      raw = null;
    }
    receipt.response = raw;
    await this.emitReceipt(receipt);
    if (response.status === 401 || response.status === 403)
      throw new BufferApiError(
        "Buffer access expired, was revoked, or is not permitted. Reconnect or review permissions.",
        "authentication",
      );
    if (response.status === 429) {
      this.notBefore = this.now() + (seconds ?? 60) * 1000;
      throw new BufferApiError(
        "Buffer is rate limited. Wait before refreshing.",
        "rate_limit",
        false,
        seconds ?? 60,
      );
    }
    if (!response.ok)
      throw new BufferApiError(
        `Buffer returned HTTP ${response.status}.`,
        "transport",
        kind === "write" && (response.status >= 500 || response.status === 408),
      );
    const envelope = this.parse(
      z.object({
        data: z.record(z.string(), z.unknown()).nullable().optional(),
        errors: z.array(z.unknown()).optional(),
      }),
      raw,
      kind === "write",
    );
    if (envelope.errors?.length)
      throw new BufferApiError(
        "Buffer returned GraphQL errors. Refresh and review before continuing.",
        "graphql",
        kind === "write",
      );
    if (!envelope.data)
      throw new BufferApiError(
        "Buffer returned no result. Check the remote state before retrying a write.",
        "schema",
        kind === "write",
      );
    return envelope.data;
  }

  private async emitReceipt(receipt: ApiReceipt) {
    // A failed logging sink cannot turn a known remote result into a request retry.
    try {
      await this.options.onReceipt?.(receipt);
    } catch {
      /* executor operation record is authoritative */
    }
  }
}

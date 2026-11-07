import { z } from "zod";

export const BufferOrganizationSchema = z.object({
  id: z.string(),
  name: z.string(),
});
export const BufferAccountSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  organizations: z.array(BufferOrganizationSchema),
});
export const BufferChannelSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  name: z.string(),
  displayName: z.string().nullable(),
  service: z.string(),
  type: z.string(),
  timezone: z.string(),
  allowedActions: z.array(z.string()),
  isDisconnected: z.boolean(),
  isLocked: z.boolean(),
  isQueuePaused: z.boolean(),
});
export const UserTagSchema = z.object({
  handle: z.string(),
  x: z.number(),
  y: z.number(),
});
export const BufferAssetSchema = z.object({
  __typename: z.string(),
  id: z.string().nullable(),
  source: z.string(),
  thumbnail: z.string(),
  mimeType: z.string(),
  type: z.string(),
  image: z
    .object({
      altText: z.string(),
      width: z.number(),
      height: z.number(),
      isAnimated: z.boolean(),
      userTags: z.array(UserTagSchema).nullable(),
    })
    .optional(),
});
export const AnnotationSchema = z.object({
  type: z.string(),
  text: z.string(),
  content: z.string(),
  indices: z.array(z.number().int()),
  url: z.string(),
});
export const BufferMetadataSchema = z.object({
  __typename: z.string(),
  type: z.string().optional(),
  annotations: z.array(AnnotationSchema).optional(),
  firstComment: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  linkAttachment: z
    .object({
      url: z.string(),
      title: z.string(),
      text: z.string(),
      thumbnail: z.string().nullable(),
      expandedUrl: z.string().nullable(),
      thumbnails: z.array(z.string()),
    })
    .nullable()
    .optional(),
  geolocation: z
    .object({ id: z.string().nullable(), text: z.string().nullable() })
    .nullable()
    .optional(),
  isAiGenerated: z.boolean().optional(),
  link: z.string().nullable().optional(),
  shouldShareToFeed: z.boolean().optional(),
  stickerFields: z
    .object({
      music: z.string().nullable(),
      other: z.string().nullable(),
      products: z.string().nullable(),
      text: z.string().nullable(),
      topics: z.string().nullable(),
    })
    .nullable()
    .optional(),
});
export const BufferPostSchema = z.object({
  id: z.string(),
  text: z.string(),
  channelId: z.string(),
  channelService: z.string(),
  channel: BufferChannelSchema,
  status: z.enum([
    "draft",
    "error",
    "needs_approval",
    "scheduled",
    "sending",
    "sent",
  ]),
  dueAt: z.string().nullable(),
  isCustomScheduled: z.boolean(),
  shareMode: z.enum(["addToQueue", "customScheduled", "shareNext", "shareNow"]),
  schedulingType: z.enum(["automatic", "notification"]).nullable(),
  allowedActions: z.array(z.string()),
  assets: z.array(BufferAssetSchema),
  metadata: BufferMetadataSchema.nullable(),
  tags: z.array(
    z.object({ id: z.string(), name: z.string(), color: z.string() }),
  ),
  updatedAt: z.string(),
  createdAt: z.string(),
  sentAt: z.string().nullable(),
});
export type BufferAccount = z.infer<typeof BufferAccountSchema>;
export type BufferOrganization = z.infer<typeof BufferOrganizationSchema>;
export type BufferChannel = z.infer<typeof BufferChannelSchema>;
export type BufferPost = z.infer<typeof BufferPostSchema>;
export type BufferAsset = z.infer<typeof BufferAssetSchema>;
export type PostStatus = BufferPost["status"];

export interface ReplacementImage {
  url: string;
  altText: string;
  /** Tags must be reviewed for this image. Old positional metadata is never copied. */
  userTags?: Array<z.infer<typeof UserTagSchema>>;
}

/** Intentionally cannot set approvalChange, schedulingType, tags, or arbitrary metadata. */
export interface NarrowPostEdit {
  text?: string;
  fixedScheduledAt?: string;
  replacementImage?: ReplacementImage;
  moveToDraft?: true;
}

export interface PostListOptions {
  organizationId: string;
  channelIds: string[];
  statuses: PostStatus[];
  startDate?: string;
  endDate?: string;
  first?: number;
  after?: string;
}

export interface ApiReceipt {
  at: string;
  operation: string;
  kind: "read" | "write";
  request: { query: string; variables: Record<string, unknown> };
  response?: unknown;
  httpStatus?: number;
  rateLimit?: string;
  retryAfterSeconds?: number;
  outcome: "response" | "transport_error";
}

export type BufferErrorKind =
  | "authentication"
  | "rate_limit"
  | "graphql"
  | "mutation"
  | "transport"
  | "schema"
  | "unsupported";
export class BufferApiError extends Error {
  constructor(
    message: string,
    public readonly kind: BufferErrorKind,
    public readonly uncertain = false,
    public readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = "BufferApiError";
  }
}

export interface LiveFormatEvidence {
  /** e.g. facebook:page:text or instagram:business:single-image */
  key: string;
  verifiedAt: string;
  receiptId: string;
}

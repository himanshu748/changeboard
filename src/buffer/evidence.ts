import { z } from "zod";
import type { LiveFormatEvidence } from "./types";

export const LiveFormatEvidenceSchema = z.object({
  key: z.string().min(1),
  verifiedAt: z.string().refine((s) => Number.isFinite(Date.parse(s))),
  receiptId: z.string().min(1),
  scope: z
    .object({
      draftTextEditsOnly: z.literal(true),
      channelId: z.string().min(1),
      postIds: z.array(z.string().min(1)).min(1),
    })
    .strict()
    .optional(),
});

export interface LiveWriteContext {
  key: string;
  channelId: string;
  operation: "edit" | "create";
  postId?: string;
  status?: string;
  captionOnly?: boolean;
}

export function liveFormatAllows(
  evidence: LiveFormatEvidence,
  request: LiveWriteContext,
): boolean {
  const parsed = LiveFormatEvidenceSchema.safeParse(evidence);
  if (!parsed.success || parsed.data.key !== request.key) return false;
  const scope = parsed.data.scope;
  if (!scope) return true;
  return (
    request.operation === "edit" &&
    request.status === "draft" &&
    request.captionOnly === true &&
    request.channelId === scope.channelId &&
    !!request.postId &&
    scope.postIds.includes(request.postId)
  );
}

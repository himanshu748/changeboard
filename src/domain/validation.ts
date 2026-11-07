import { createHash } from "node:crypto";
import { Temporal } from "@js-temporal/polyfill";
import { z } from "zod";
import type {
  Binding,
  DomainIssue,
  EligibilityOptions,
  Facts,
  Snapshot,
} from "./types.js";

export class DomainError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "DomainError";
  }
}

export const FactsSchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    time: z.string().regex(/^\d{2}:\d{2}$/),
    venue: z.string().trim().min(1).max(300),
    address: z.string().max(700),
    timezone: z.string().min(1).max(100),
  })
  .strict();

export function issue(
  code: string,
  message: string,
  bindingId?: string,
  severity: "error" | "warning" = "error",
): DomainIssue {
  return { code, message, severity, ...(bindingId ? { bindingId } : {}) };
}

export function validateFacts(facts: Facts): DomainIssue[] {
  const parsed = FactsSchema.safeParse(facts);
  if (!parsed.success)
    return parsed.error.issues.map((e) =>
      issue("INVALID_FACT", `${e.path.join(".")}: ${e.message}`),
    );
  const issues: DomainIssue[] = [];
  try {
    Temporal.PlainDate.from(facts.date);
  } catch {
    issues.push(issue("INVALID_DATE", "Choose a valid calendar date."));
  }
  try {
    Temporal.PlainTime.from(facts.time, { overflow: "reject" });
  } catch {
    issues.push(issue("INVALID_TIME", "Choose a valid 24-hour start time."));
  }
  try {
    if (/^[+-]/.test(facts.timezone)) throw new Error("fixed offset");
    new Intl.DateTimeFormat("en", { timeZone: facts.timezone });
    Temporal.Instant.from("2026-01-01T00:00:00Z").toZonedDateTimeISO(
      facts.timezone,
    );
  } catch {
    issues.push(
      issue(
        "INVALID_TIMEZONE",
        "Choose a named IANA timezone, for example Europe/London.",
      ),
    );
  }
  if (!issues.length) {
    try {
      Temporal.PlainDateTime.from(
        `${facts.date}T${facts.time}`,
      ).toZonedDateTime(facts.timezone, { disambiguation: "reject" });
    } catch {
      issues.push(
        issue(
          "AMBIGUOUS_EVENT_TIME",
          "The event time is nonexistent or ambiguous during a daylight-saving transition. Choose an unambiguous time.",
        ),
      );
    }
  }
  return issues;
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, v]) => v !== undefined)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, canonical(v)]),
    );
  return value;
}

/** Fingerprints include permission, metadata, asset and schedule context, not only captions. */
export function fingerprintSnapshot(snapshot: Snapshot): string {
  const { fingerprint: _ignored, ...source } = snapshot;
  return createHash("sha256")
    .update(JSON.stringify(canonical(source)))
    .digest("hex");
}

export function isUtf16Boundary(text: string, index: number): boolean {
  if (index <= 0 || index >= text.length) return true;
  const left = text.charCodeAt(index - 1),
    right = text.charCodeAt(index);
  return !(
    left >= 0xd800 &&
    left <= 0xdbff &&
    right >= 0xdc00 &&
    right <= 0xdfff
  );
}

export function validateBindings(
  snapshot: Snapshot,
  bindings: Binding[],
): DomainIssue[] {
  const issues: DomainIssue[] = [];
  const fingerprint = fingerprintSnapshot(snapshot);
  const active = bindings.filter((b) => !b.ignored);
  const ids = new Set<string>();
  for (const b of active) {
    if (ids.has(b.id))
      issues.push(
        issue(
          "DUPLICATE_BINDING",
          "Each association must have a unique ID.",
          b.id,
        ),
      );
    ids.add(b.id);
    if (!["date", "time", "venue", "address"].includes(b.fact))
      issues.push(
        issue("INVALID_FACT_ID", "This fact type is not supported.", b.id),
      );
    if (!["literal", "weekday", "date", "time", "relative"].includes(b.kind))
      issues.push(
        issue(
          "INVALID_BINDING_KIND",
          "This expression type is not supported.",
          b.id,
        ),
      );
    if (
      !Number.isInteger(b.start) ||
      !Number.isInteger(b.end) ||
      b.start < 0 ||
      b.end <= b.start ||
      b.end > snapshot.text.length ||
      !isUtf16Boundary(snapshot.text, b.start) ||
      !isUtf16Boundary(snapshot.text, b.end)
    ) {
      issues.push(
        issue(
          "INVALID_SPAN",
          "Select a complete, nonempty phrase without splitting a Unicode character.",
          b.id,
        ),
      );
    } else if (snapshot.text.slice(b.start, b.end) !== b.text)
      issues.push(
        issue(
          "SUBSTRING_MISMATCH",
          "The source phrase no longer matches its saved position.",
          b.id,
        ),
      );
    if (b.sourceFingerprint !== fingerprint)
      issues.push(
        issue(
          "SOURCE_CHANGED",
          "The source changed. Refresh it and reconnect its facts before applying.",
          b.id,
        ),
      );
    if (
      b.kind === "relative" &&
      (b.fact !== "date" || !/^(today|tomorrow|in \d+ days?)$/i.test(b.text))
    )
      issues.push(
        issue(
          "UNSUPPORTED_EXPRESSION",
          "Only today, tomorrow and in N days can be interpreted as relative expressions.",
          b.id,
        ),
      );
    if ((b.kind === "weekday" || b.kind === "date") && b.fact !== "date")
      issues.push(
        issue(
          "INVALID_KIND_FACT",
          "A date expression must be connected to the event date.",
          b.id,
        ),
      );
    if (b.kind === "time" && b.fact !== "time")
      issues.push(
        issue(
          "INVALID_KIND_FACT",
          "A time expression must be connected to the start time.",
          b.id,
        ),
      );
  }
  const sorted = [...active].sort((a, b) => a.start - b.start || a.end - b.end);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].start < sorted[i - 1].end)
      issues.push(
        issue(
          "OVERLAPPING_BINDINGS",
          "These associations overlap. Keep one association for each caption span.",
          sorted[i].id,
        ),
      );
  }
  return issues;
}

function containsMentions(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some(containsMentions);
  return Object.entries(value).some(([key, val]) => {
    if (
      /^(mentions|mentionAnnotations|structuredMentions|textEntities)$/i.test(
        key,
      ) &&
      val &&
      (!Array.isArray(val) || val.length > 0)
    )
      return true;
    if ((key === "type" || key === "kind") && val === "mention") return true;
    return containsMentions(val);
  });
}

export function eligibility(
  snapshot: Snapshot,
  options: EligibilityOptions = {},
): { eligible: boolean; issues: DomainIssue[] } {
  const issues: DomainIssue[] = [];
  const service = snapshot.service.toLowerCase();
  if (!["facebook", "instagram"].includes(service))
    issues.push(
      issue(
        "UNSUPPORTED_CHANNEL",
        "Only tested Facebook Page and Instagram professional channels support this workflow.",
      ),
    );
  if (
    options.liveVerifiedServices &&
    !options.liveVerifiedServices.includes(service)
  )
    issues.push(
      issue(
        "UNVERIFIED_CHANNEL",
        "Live repair is disabled until this channel and format have been verified.",
      ),
    );
  if (!["draft", "scheduled", "buffer"].includes(snapshot.status.toLowerCase()))
    issues.push(
      issue(
        "POST_NOT_EDITABLE",
        /^(sent|published)$/i.test(snapshot.status)
          ? "Already published. Prepare a separate correction draft."
          : "This post is sending or is not in an editable state.",
      ),
    );
  if (
    !snapshot.allowedActions.some((action) =>
      /^(edit|editPost|updatePost)$/i.test(action),
    )
  )
    issues.push(
      issue(
        "EDIT_NOT_PERMITTED",
        "Your channel permissions do not permit editing this post.",
      ),
    );
  if (
    typeof snapshot.metadata.unsupportedReason === "string" &&
    snapshot.metadata.unsupportedReason
  )
    issues.push(
      issue("UNSUPPORTED_FORMAT", snapshot.metadata.unsupportedReason),
    );
  if (snapshot.metadata.channelLocked || snapshot.metadata.channelDisconnected)
    issues.push(
      issue(
        "CHANNEL_UNAVAILABLE",
        "This channel is disconnected or locked in Buffer.",
      ),
    );
  if (snapshot.metadata.schedulingType === "notification")
    issues.push(
      issue(
        "NOTIFICATION_PUBLISHING",
        "Notification publishing needs a separate manual review and is not enabled.",
      ),
    );
  if (snapshot.structuredMentions || containsMentions(snapshot.metadata))
    issues.push(
      issue(
        "STRUCTURED_MENTIONS",
        "Structured mention annotations cannot yet be safely repositioned.",
      ),
    );
  if (
    snapshot.assets.length > 1 ||
    snapshot.assets.some((a) => a.type !== "image")
  )
    issues.push(
      issue(
        "UNSUPPORTED_FORMAT",
        "Only ordinary text and single-image posts can be repaired.",
      ),
    );
  const meta = snapshot.metadata as Record<string, unknown>;
  if (
    Array.isArray(meta.thread) ||
    meta.isThread ||
    meta.format === "story" ||
    meta.format === "reel" ||
    meta.format === "carousel"
  )
    issues.push(
      issue(
        "UNSUPPORTED_FORMAT",
        "Threads, stories, reels and carousels are outside this workflow.",
      ),
    );
  const serviceMeta = meta[service];
  if (
    serviceMeta &&
    typeof serviceMeta === "object" &&
    ["story", "reel", "carousel"].includes(
      String((serviceMeta as Record<string, unknown>).type),
    )
  )
    issues.push(
      issue(
        "UNSUPPORTED_FORMAT",
        "This channel-specific post format is not supported.",
      ),
    );
  if (snapshot.status !== "draft" && snapshot.scheduledAt) {
    try {
      const due = Temporal.Instant.from(snapshot.scheduledAt);
      const now = Temporal.Instant.from(
        options.now ?? new Date().toISOString(),
      );
      const cutoff = options.cutoffMinutes ?? 10;
      if (!Number.isFinite(cutoff) || cutoff < 0) throw new Error("cutoff");
      if (Temporal.Instant.compare(due, now.add({ minutes: cutoff })) <= 0)
        issues.push(
          issue(
            "PUBLICATION_CUTOFF",
            `Withheld inside Changeboard's ${cutoff}-minute publication safety window or after its scheduled time.`,
          ),
        );
    } catch {
      issues.push(
        issue(
          "INVALID_SCHEDULE",
          "The observed publication time is invalid. Refresh this post.",
        ),
      );
    }
  }
  if (snapshot.mode === "customScheduled" && !snapshot.scheduledAt)
    issues.push(
      issue(
        "MISSING_SCHEDULE",
        "A fixed schedule requires an observed publication instant.",
      ),
    );
  return { eligible: !issues.some((i) => i.severity === "error"), issues };
}

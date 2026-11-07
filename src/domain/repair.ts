import { Temporal } from "@js-temporal/polyfill";
import { formatDate, formatTime } from "./bindings.js";
import {
  DomainError,
  eligibility,
  fingerprintSnapshot,
  issue,
  validateBindings,
  validateFacts,
} from "./validation.js";
import {
  relativeContext,
  renderRelative,
  resolveSchedule,
  reminderOffset,
} from "./time.js";
import type {
  Binding,
  CaptionChange,
  Facts,
  RepairResult,
  ScheduleOptions,
  Snapshot,
} from "./types.js";

function replacement(
  binding: Binding,
  facts: Facts,
  result: RepairResult,
  options: ScheduleOptions,
): string {
  if (binding.kind === "relative") {
    if (options.strategy === "explicit_date") return formatDate(facts.date);
    if (result.mode !== "customScheduled" || !result.scheduledAt)
      throw new DomainError(
        "FLOATING_SCHEDULE",
        "Relative wording requires a confirmed fixed publication time, or use the explicit event date.",
      );
    if (!options.fixedTimeConfirmed && !options.offsetConfirmed)
      throw new DomainError(
        "FIXED_TIME_UNCONFIRMED",
        "Confirm the fixed publication time before approving relative wording.",
      );
    if (!result.relativeContext)
      throw new DomainError(
        "INVALID_SCHEDULE",
        "Review the publication timezone before interpreting relative wording.",
      );
    return renderRelative(result.relativeContext.days, binding.text);
  }
  if (binding.fact === "date") {
    if (binding.format === "this-weekday") {
      if (options.strategy === "explicit_date") return formatDate(facts.date);
      if (
        result.mode !== "customScheduled" ||
        !result.relativeContext ||
        result.relativeContext.days < 0 ||
        result.relativeContext.days > 6
      )
        throw new DomainError(
          "WEEKDAY_CONTEXT",
          "“This” weekday is not reliably anchored to the event. Use the explicit event date or review a fixed publication time.",
        );
      return formatDate(facts.date, "this-weekday");
    }
    const value = formatDate(
      facts.date,
      binding.kind === "weekday" ? "weekday" : binding.format,
    );
    return binding.text === binding.text.toLowerCase() &&
      binding.kind === "weekday"
      ? value.toLowerCase()
      : value;
  }
  if (binding.fact === "time") return formatTime(facts.time, binding.format);
  return facts[binding.fact];
}

/** Computes a proposal only; it neither approves nor writes any remote state. */
export function repairPost(
  snapshot: Snapshot,
  bindings: Binding[],
  oldFacts: Facts,
  newFacts: Facts,
  options: ScheduleOptions = {},
): RepairResult {
  const result: RepairResult = {
    text: snapshot.text,
    scheduledAt: snapshot.scheduledAt,
    mode: snapshot.mode,
    changes: [],
    bindings: bindings.map((b) => ({ ...b })),
    issues: [],
    eligible: false,
  };
  result.issues.push(
    ...validateFacts(oldFacts),
    ...validateFacts(newFacts),
    ...validateBindings(snapshot, bindings),
    ...eligibility(snapshot, options).issues,
  );
  const active = bindings.filter((b) => !b.ignored);
  for (const b of active.filter((b) => !b.confirmed))
    result.issues.push(
      issue(
        "UNCONFIRMED_BINDING",
        "Confirm or ignore this factual phrase before applying.",
        b.id,
      ),
    );
  if (
    result.issues.some((i) =>
      [
        "INVALID_FACT",
        "INVALID_DATE",
        "INVALID_TIME",
        "INVALID_TIMEZONE",
        "AMBIGUOUS_EVENT_TIME",
        "INVALID_SPAN",
        "SUBSTRING_MISMATCH",
        "OVERLAPPING_BINDINGS",
        "SOURCE_CHANGED",
        "DUPLICATE_BINDING",
        "INVALID_FACT_ID",
        "INVALID_BINDING_KIND",
        "INVALID_KIND_FACT",
      ].includes(i.code),
    )
  )
    return result;
  try {
    result.offset = reminderOffset(snapshot, oldFacts);
  } catch {
    /* There is no safely interpretable fixed-source offset to offer. */
  }
  try {
    const schedule = resolveSchedule(snapshot, oldFacts, newFacts, options);
    result.scheduledAt = schedule.scheduledAt;
    result.mode = schedule.mode;
    if (schedule.offset) result.offset = schedule.offset;
    if (schedule.scheduledAt)
      result.relativeContext = relativeContext(
        schedule.scheduledAt,
        newFacts,
        snapshot.channelTimezone,
      );
    if (schedule.scheduledAt && schedule.scheduledAt !== snapshot.scheduledAt) {
      const now = Temporal.Instant.from(
        options.now ?? new Date().toISOString(),
      );
      if (
        Temporal.Instant.compare(
          Temporal.Instant.from(schedule.scheduledAt),
          now.add({ minutes: options.cutoffMinutes ?? 10 }),
        ) <= 0
      )
        result.issues.push(
          issue(
            "PROPOSED_SCHEDULE_CUTOFF",
            "The proposed publication time is in the past or inside the publication safety window.",
          ),
        );
    }
  } catch (error) {
    result.issues.push(
      issue(
        error instanceof DomainError ? error.code : "INVALID_SCHEDULE",
        error instanceof DomainError
          ? error.message
          : "The publication time or timezone is invalid.",
      ),
    );
  }
  const unsupported =
    /\b(tonight|yesterday|next week|this weekend|next month|in a (?:week|month)|next (?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday))\b/gi;
  for (const m of snapshot.text.matchAll(unsupported)) {
    if (
      !active.some(
        (b) =>
          b.confirmed && b.start <= m.index && b.end >= m.index + m[0].length,
      )
    )
      result.issues.push(
        issue(
          "UNSUPPORTED_EXPRESSION",
          `“${m[0]}” needs manual review; this expression is not interpreted automatically.`,
        ),
      );
  }
  let cursor = 0,
    output = "";
  const nextBindings: Binding[] = [];
  for (const b of [...active].sort((a, z) => a.start - z.start)) {
    let after = b.text;
    if (
      b.confirmed &&
      (b.kind === "relative" ||
        b.format === "this-weekday" ||
        oldFacts[b.fact] !== newFacts[b.fact])
    ) {
      try {
        after = replacement(b, newFacts, result, options);
      } catch (error) {
        result.issues.push(
          issue(
            error instanceof DomainError ? error.code : "INVALID_REPLACEMENT",
            error instanceof DomainError
              ? error.message
              : "This phrase could not be safely repaired.",
            b.id,
          ),
        );
      }
    }
    output += snapshot.text.slice(cursor, b.start);
    const newStart = output.length;
    output += after;
    const newEnd = output.length;
    if (after !== b.text) {
      const change: CaptionChange = {
        bindingId: b.id,
        fact: b.fact,
        start: b.start,
        end: b.end,
        before: b.text,
        after,
        newStart,
        newEnd,
        reason:
          b.kind === "relative"
            ? "Recomputed from the event date and explicitly reviewed publication context."
            : `Connected ${b.fact} changed; surrounding writing is preserved.`,
      };
      result.changes.push(change);
    }
    nextBindings.push({
      ...b,
      start: newStart,
      end: newEnd,
      text: after,
      ...((b.kind === "relative" || b.format === "this-weekday") &&
      options.strategy === "explicit_date"
        ? { kind: "date" as const, format: "long" }
        : {}),
    });
    cursor = b.end;
  }
  result.text = output + snapshot.text.slice(cursor);
  const proposed = {
    ...snapshot,
    text: result.text,
    scheduledAt: result.scheduledAt,
    mode: result.mode,
  };
  const fingerprint = fingerprintSnapshot(proposed);
  result.bindings = nextBindings.map((b) => ({
    ...b,
    sourceFingerprint: fingerprint,
  }));
  result.eligible = !result.issues.some((i) => i.severity === "error");
  return result;
}

/** Call only after a successful write has been re-fetched and verified. */
export function rebaseBindings(
  verifiedSnapshot: Snapshot,
  _sourceBindings: Binding[],
  repair: RepairResult,
): Binding[] {
  if (!repair.eligible)
    throw new DomainError(
      "UNAPPROVABLE_REPAIR",
      "An unresolved proposal cannot become a verified source.",
    );
  const sameInstant =
    verifiedSnapshot.scheduledAt === repair.scheduledAt ||
    (!!verifiedSnapshot.scheduledAt &&
      !!repair.scheduledAt &&
      Temporal.Instant.compare(
        Temporal.Instant.from(verifiedSnapshot.scheduledAt),
        Temporal.Instant.from(repair.scheduledAt),
      ) === 0);
  if (
    verifiedSnapshot.text !== repair.text ||
    verifiedSnapshot.mode !== repair.mode ||
    !sameInstant
  )
    throw new DomainError(
      "VERIFICATION_MISMATCH",
      "The observed remote caption or schedule does not match the approved repair.",
    );
  const fingerprint = fingerprintSnapshot(verifiedSnapshot);
  const bindings = repair.bindings
    .filter((b) => b.confirmed)
    .map((b) => ({ ...b, sourceFingerprint: fingerprint }));
  const issues = validateBindings(verifiedSnapshot, bindings);
  if (issues.length)
    throw new DomainError(
      "INVALID_REBASE",
      "The verified snapshot does not support the repaired associations.",
    );
  return bindings;
}

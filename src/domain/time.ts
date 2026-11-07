import { Temporal } from "@js-temporal/polyfill";
import { DomainError } from "./validation.js";
import type {
  Facts,
  RelativeContext,
  ScheduleOptions,
  Snapshot,
} from "./types.js";

export function eventInstant(facts: Facts): string {
  try {
    return Temporal.PlainDateTime.from(`${facts.date}T${facts.time}`)
      .toZonedDateTime(facts.timezone, { disambiguation: "reject" })
      .toInstant()
      .toString();
  } catch {
    throw new DomainError(
      "AMBIGUOUS_EVENT_TIME",
      "Choose an unambiguous event time outside a daylight-saving gap or overlap.",
    );
  }
}

export function localToInstant(local: string, timezone: string): string {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(local))
    throw new DomainError(
      "INVALID_LOCAL_TIME",
      "Enter a local date and time without a UTC offset.",
    );
  try {
    return Temporal.PlainDateTime.from(local)
      .toZonedDateTime(timezone, { disambiguation: "reject" })
      .toInstant()
      .toString();
  } catch {
    throw new DomainError(
      "AMBIGUOUS_PUBLICATION_TIME",
      "This publication time is nonexistent or ambiguous during a daylight-saving transition.",
    );
  }
}

export function relativeContext(
  instant: string,
  facts: Facts,
  channelTimezone: string,
): RelativeContext {
  const publication = Temporal.Instant.from(instant)
    .toZonedDateTimeISO(facts.timezone)
    .toPlainDate();
  const event = Temporal.PlainDate.from(facts.date);
  return {
    publicationDate: publication.toString(),
    eventDate: event.toString(),
    channelDate: Temporal.Instant.from(instant)
      .toZonedDateTimeISO(channelTimezone)
      .toPlainDate()
      .toString(),
    eventTimezone: facts.timezone,
    channelTimezone,
    days: publication.until(event, { largestUnit: "days" }).days,
  };
}

export function renderRelative(days: number, original: string): string {
  if (!Number.isInteger(days) || days < 0)
    throw new DomainError(
      "EVENT_BEFORE_PUBLICATION",
      "The event date is before publication. Choose an explicit date or another publication time.",
    );
  const prior =
    original.toLowerCase() === "today"
      ? 0
      : original.toLowerCase() === "tomorrow"
        ? 1
        : /^in (\d+) days?$/i.exec(original)?.[1];
  if (prior !== undefined && Number(prior) === days) return original;
  let value =
    days === 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`;
  if (original === original.toUpperCase()) value = value.toUpperCase();
  else if (/^[A-Z]/.test(original))
    value = value[0].toUpperCase() + value.slice(1);
  return value;
}

export function reminderOffset(
  snapshot: Snapshot,
  oldFacts: Facts,
): { days: number; minutes: number; description: string } {
  if (snapshot.mode !== "customScheduled" || !snapshot.scheduledAt)
    throw new DomainError(
      "FLOATING_SCHEDULE",
      "A reminder offset requires a fixed source publication time.",
    );
  const publication = Temporal.Instant.from(snapshot.scheduledAt)
    .toZonedDateTimeISO(oldFacts.timezone)
    .toPlainDateTime();
  const event = Temporal.PlainDateTime.from(
    `${oldFacts.date}T${oldFacts.time}`,
  );
  const duration = publication.until(event, {
    largestUnit: "days",
    smallestUnit: "minutes",
  });
  if (duration.sign < 0)
    throw new DomainError(
      "INVALID_REMINDER_OFFSET",
      "The source publication is after the event. Review its schedule manually.",
    );
  const minutes = duration.hours * 60 + duration.minutes;
  return {
    days: duration.days,
    minutes,
    description: `${duration.days} calendar day${duration.days === 1 ? "" : "s"} and ${minutes} minute${minutes === 1 ? "" : "s"} before the event in ${oldFacts.timezone}`,
  };
}

export function resolveSchedule(
  snapshot: Snapshot,
  oldFacts: Facts,
  newFacts: Facts,
  options: ScheduleOptions,
): {
  scheduledAt: string | null;
  mode: Snapshot["mode"];
  offset?: ReturnType<typeof reminderOffset>;
} {
  const strategy = options.strategy ?? "keep";
  if (
    (snapshot.status === "draft" || snapshot.mode === "draft") &&
    (strategy === "fix_time" || strategy === "preserve_offset")
  ) {
    throw new DomainError(
      "DRAFT_SCHEDULING_UNSUPPORTED",
      "Scheduling draft posts is not enabled. Use an explicit event date and keep this post as a draft.",
    );
  }
  if (strategy === "fix_time") {
    if (!options.fixedTimeConfirmed || !options.fixedLocalTime)
      throw new DomainError(
        "FIXED_TIME_UNCONFIRMED",
        "Approve a fixed publication date and time before interpreting relative wording.",
      );
    return {
      scheduledAt: localToInstant(options.fixedLocalTime, newFacts.timezone),
      mode: "customScheduled",
    };
  }
  if (strategy === "preserve_offset") {
    if (!options.offsetConfirmed)
      throw new DomainError(
        "OFFSET_UNCONFIRMED",
        "Confirm the reminder offset before changing publication time.",
      );
    if (oldFacts.timezone !== newFacts.timezone)
      throw new DomainError(
        "OFFSET_ZONE_CHANGED",
        "The event timezone changed. Choose a new fixed publication time instead of reusing the offset.",
      );
    const offset = reminderOffset(snapshot, oldFacts);
    const newLocal = Temporal.PlainDateTime.from(
      `${newFacts.date}T${newFacts.time}`,
    ).subtract({ days: offset.days, minutes: offset.minutes });
    return {
      scheduledAt: localToInstant(
        newLocal.toString({ smallestUnit: "minute" }),
        newFacts.timezone,
      ),
      mode: "customScheduled",
      offset,
    };
  }
  return { scheduledAt: snapshot.scheduledAt, mode: snapshot.mode };
}

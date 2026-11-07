import { createHash } from "node:crypto";
import { Temporal } from "@js-temporal/polyfill";
import {
  DomainError,
  fingerprintSnapshot,
  isUtf16Boundary,
} from "./validation.js";
import type {
  Binding,
  BindingInput,
  BindingKind,
  Facts,
  Snapshot,
} from "./types.js";

const weekdays = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function weekday(date: string): string {
  return weekdays[Temporal.PlainDate.from(date).dayOfWeek - 1];
}

export function formatDate(date: string, format = "long"): string {
  const d = Temporal.PlainDate.from(date);
  const month = months[d.month - 1];
  switch (format) {
    case "iso":
      return d.toString();
    case "weekday":
      return weekday(date);
    case "this-weekday":
      return `this ${weekday(date)}`;
    case "weekday-long":
      return `${weekday(date)}, ${month} ${d.day}, ${d.year}`;
    case "mdy":
      return `${month} ${d.day}, ${d.year}`;
    case "md":
      return `${month} ${d.day}`;
    case "short-md":
      return `${month.slice(0, 3)} ${d.day}`;
    case "short-dm":
      return `${d.day} ${month.slice(0, 3)}`;
    case "dm":
      return `${d.day} ${month}`;
    default:
      return `${d.day} ${month} ${d.year}`;
  }
}

export function formatTime(time: string, format = "12-dot"): string {
  const t = Temporal.PlainTime.from(time);
  const hour = t.hour % 12 || 12;
  const min = t.minute.toString().padStart(2, "0");
  const includeMinutes = t.minute !== 0 || format.includes("minutes");
  const base = `${hour}${includeMinutes ? `:${min}` : ""}`;
  if (format === "24") return `${t.hour.toString().padStart(2, "0")}:${min}`;
  if (format.includes("compact")) return `${base}${t.hour >= 12 ? "pm" : "am"}`;
  if (format.includes("upper")) return `${base} ${t.hour >= 12 ? "PM" : "AM"}`;
  return `${base} ${t.hour >= 12 ? "p.m." : "a.m."}`;
}

function timeFormat(text: string): string {
  if (/^\d{1,2}:\d{2}$/.test(text)) return "24";
  const suffix = text.includes(":") ? "-minutes" : "";
  if (/[AP]M/.test(text)) return `12-upper${suffix}`;
  if (/\d[ap]m$/i.test(text)) return `12-compact${suffix}`;
  return `12-dot${suffix}`;
}

function detectedKind(fact: BindingInput["fact"], text: string): BindingKind {
  if (fact === "date") {
    if (/^(today|tomorrow|in \d+ days?)$/i.test(text)) return "relative";
    if (weekdays.some((d) => d.toLowerCase() === text.toLowerCase()))
      return "weekday";
    return "date";
  }
  return fact === "time" ? "time" : "literal";
}

function formatFor(kind: BindingKind, text: string): string | undefined {
  if (kind === "time") return timeFormat(text);
  if (kind === "weekday") return "weekday";
  if (kind !== "date") return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return "iso";
  if (/^[A-Za-z]+, [A-Za-z]+ \d{1,2}, \d{4}$/.test(text)) return "weekday-long";
  if (/^[A-Za-z]+ \d{1,2}, \d{4}$/.test(text)) return "mdy";
  if (/^[A-Za-z]{3} \d{1,2}$/.test(text)) return "short-md";
  if (/^[A-Za-z]+ \d{1,2}$/.test(text)) return "md";
  if (/^\d{1,2} [A-Za-z]{3}$/.test(text)) return "short-dm";
  if (/^\d{1,2} [A-Za-z]+$/.test(text)) return "dm";
  return "long";
}

export function occurrences(text: string, phrase: string): number[] {
  if (!phrase) return [];
  const results: number[] = [];
  let start = 0;
  while (start <= text.length - phrase.length) {
    const index = text.indexOf(phrase, start);
    if (index < 0) break;
    if (
      isUtf16Boundary(text, index) &&
      isUtf16Boundary(text, index + phrase.length)
    )
      results.push(index);
    start = index + 1;
  }
  return results;
}

function makeBinding(
  snapshot: Snapshot,
  input: BindingInput,
  start: number,
  kind: BindingKind,
): Binding {
  return {
    id: `binding_${createHash("sha256").update(`${snapshot.id}:${input.fact}:${start}:${input.text}`).digest("hex").slice(0, 20)}`,
    fact: input.fact,
    start,
    end: start + input.text.length,
    text: input.text,
    kind,
    confirmed: false,
    sourceFingerprint: fingerprintSnapshot(snapshot),
    format: formatFor(kind, input.text),
  };
}

/** Manual associations are suggestions until the caller explicitly confirms them. */
export function createBinding(
  snapshot: Snapshot,
  input: BindingInput,
): Binding {
  if (!["date", "time", "venue", "address"].includes(input.fact))
    throw new DomainError("INVALID_FACT_ID", "Choose a supported event fact.");
  if (!input.text || input.text.length > 2000)
    throw new DomainError(
      "INVALID_PHRASE",
      "Select a nonempty caption phrase of at most 2,000 characters.",
    );
  const matches = occurrences(snapshot.text, input.text);
  if (!matches.length)
    throw new DomainError(
      "PHRASE_NOT_FOUND",
      "That exact phrase does not appear in this caption.",
    );
  if (matches.length > 1 && input.occurrence === undefined)
    throw new DomainError(
      "AMBIGUOUS_OCCURRENCE",
      "The phrase appears more than once. Select its exact occurrence.",
    );
  const occurrence = input.occurrence ?? 0;
  if (
    !Number.isInteger(occurrence) ||
    occurrence < 0 ||
    occurrence >= matches.length
  )
    throw new DomainError(
      "INVALID_OCCURRENCE",
      "Choose an occurrence that exists in this caption.",
    );
  const kind = input.kind ?? detectedKind(input.fact, input.text);
  return makeBinding(snapshot, input, matches[occurrence], kind);
}

/** Deterministic exact matching only. No caption is sent to an AI provider. */
export function suggestBindings(snapshot: Snapshot, facts: Facts): Binding[] {
  const candidates: {
    fact: BindingInput["fact"];
    text: string;
    kind?: BindingKind;
  }[] = [
    { fact: "venue", text: facts.venue },
    { fact: "address", text: facts.address },
  ];
  for (const format of [
    "weekday-long",
    "mdy",
    "long",
    "iso",
    "md",
    "dm",
    "short-md",
    "short-dm",
    "this-weekday",
    "weekday",
  ]) {
    candidates.push({
      fact: "date",
      text: formatDate(facts.date, format),
      kind: format.endsWith("weekday") ? "weekday" : "date",
    });
  }
  for (const format of [
    "12-dot",
    "12-dot-minutes",
    "12-upper",
    "12-upper-minutes",
    "12-compact",
    "12-compact-minutes",
    "24",
  ]) {
    candidates.push({
      fact: "time",
      text: formatTime(facts.time, format),
      kind: "time",
    });
  }
  const result: Binding[] = [];
  for (const candidate of candidates
    .filter((c) => c.text)
    .sort((a, b) => b.text.length - a.text.length)) {
    for (const start of occurrences(snapshot.text, candidate.text)) {
      const end = start + candidate.text.length;
      // A word fragment is never inferred to be an event reference.
      if (
        (/[\p{L}\p{N}]/u.test(candidate.text[0]) &&
          start > 0 &&
          /[\p{L}\p{N}]/u.test(snapshot.text[start - 1])) ||
        (/[\p{L}\p{N}]/u.test(candidate.text.at(-1) ?? "") &&
          /[\p{L}\p{N}]/u.test(snapshot.text[end] ?? ""))
      )
        continue;
      if (
        result.some(
          (b) => b.fact === candidate.fact && start < b.end && end > b.start,
        )
      )
        continue;
      const binding = makeBinding(
        snapshot,
        candidate,
        start,
        candidate.kind ?? detectedKind(candidate.fact, candidate.text),
      );
      if (candidate.kind === "weekday" && candidate.text.startsWith("this "))
        binding.format = "this-weekday";
      result.push(binding);
    }
  }
  for (const match of snapshot.text.matchAll(
    /\b(today|tomorrow|in \d+ days?)\b/gi,
  )) {
    result.push(
      makeBinding(
        snapshot,
        { fact: "date", text: match[0] },
        match.index,
        "relative",
      ),
    );
  }
  return result.sort((a, b) => a.start - b.start || a.end - b.end);
}

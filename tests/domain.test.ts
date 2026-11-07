import { describe, expect, it } from "vitest";
import {
  createBinding,
  eligibility,
  eventInstant,
  fingerprintSnapshot,
  localToInstant,
  rebaseBindings,
  relativeContext,
  reminderOffset,
  renderRelative,
  repairPost,
  resolveSchedule,
  suggestBindings,
  validateBindings,
  validateFacts,
} from "../src/domain/index.js";
import type { Binding, Facts, Snapshot } from "../src/domain/index.js";

const facts: Facts = {
  date: "2026-11-21",
  time: "18:00",
  venue: "Mill Studio",
  address: "12 Clay Lane",
  timezone: "Europe/London",
};
const changed: Facts = {
  ...facts,
  date: "2026-11-22",
  time: "16:00",
  venue: "River Studio",
};
const now = "2026-10-25T00:00:00Z";
function post(
  text = "Join Clay After Hours at Mill Studio this Saturday. Materials and tea included.",
): Snapshot {
  return {
    id: "post-1",
    channelId: "channel-1",
    channelName: "Clay After Hours",
    service: "facebook",
    status: "scheduled",
    text,
    scheduledAt: "2026-11-20T18:00:00Z",
    mode: "customScheduled",
    assets: [],
    metadata: {
      tags: ["workshop"],
      facebook: { link: "https://example.com/?q=clay" },
    },
    allowedActions: ["edit", "moveToDraft"],
    channelTimezone: "Europe/London",
  };
}
const confirmed = (p: Snapshot, source = facts): Binding[] =>
  suggestBindings(p, source).map((b) => ({ ...b, confirmed: true }));

describe("literal integrity and persistent associations", () => {
  it("changes only confirmed exact spans, preserving Unicode, URLs, punctuation and unrelated prose", () => {
    const p = post(
      "🧑🏽‍🎨 Café e\u0301 — Mill Studio; Mill Studio is also our sponsor. https://x.test/Mill-Studio?x=🎨",
    );
    const b = {
      ...createBinding(p, {
        fact: "venue",
        text: "Mill Studio",
        occurrence: 0,
      }),
      confirmed: true,
    };
    const result = repairPost(p, [b], facts, changed, { now });
    expect(result.eligible).toBe(true);
    expect(result.text).toBe(
      "🧑🏽‍🎨 Café e\u0301 — River Studio; Mill Studio is also our sponsor. https://x.test/Mill-Studio?x=🎨",
    );
    expect(p.text).toContain("Mill Studio; Mill Studio");
  });

  it("requires explicit occurrence selection for duplicate phrases", () => {
    const p = post("Mill Studio and Mill Studio");
    expect(() =>
      createBinding(p, { fact: "venue", text: "Mill Studio" }),
    ).toThrow("more than once");
    expect(
      createBinding(p, { fact: "venue", text: "Mill Studio", occurrence: 1 })
        .start,
    ).toBe(16);
    expect(() =>
      createBinding(p, { fact: "venue", text: "Mill Studio", occurrence: 2 }),
    ).toThrow("exists");
  });

  it("rejects overlapping bindings and Unicode surrogate boundaries", () => {
    const p = post("🎨 Mill Studio");
    const b = createBinding(p, { fact: "venue", text: "Mill Studio" });
    const overlap = { ...b, id: "other", text: "Studio", start: 8, end: 14 };
    expect(
      validateBindings(p, [b, overlap]).some(
        (i) => i.code === "OVERLAPPING_BINDINGS",
      ),
    ).toBe(true);
    const broken = { ...b, start: 1, end: 2, text: p.text.slice(1, 2) };
    expect(
      validateBindings(p, [broken]).some((i) => i.code === "INVALID_SPAN"),
    ).toBe(true);
  });

  it("rejects invalid fact IDs and source substring tampering", () => {
    const p = post();
    const b = createBinding(p, { fact: "venue", text: "Mill Studio" });
    expect(
      validateBindings(p, [{ ...b, text: "Somewhere else" }])[0].code,
    ).toBe("SUBSTRING_MISMATCH");
    expect(
      validateBindings(p, [{ ...b, fact: "price" as never }]).some(
        (i) => i.code === "INVALID_FACT_ID",
      ),
    ).toBe(true);
  });

  it("does not change unconfirmed references, and makes them unresolved", () => {
    const p = post();
    const result = repairPost(p, suggestBindings(p, facts), facts, changed, {
      now,
    });
    expect(result.text).toBe(p.text);
    expect(result.eligible).toBe(false);
    expect(result.issues.some((i) => i.code === "UNCONFIRMED_BINDING")).toBe(
      true,
    );
  });

  it("does not treat ignored suggestions as approved replacements", () => {
    const p = post();
    const b = confirmed(p).map((b) => ({ ...b, ignored: b.fact === "venue" }));
    const result = repairPost(p, b, facts, changed, { now });
    expect(result.text).toContain("Mill Studio this Sunday");
  });

  it("keeps unchanged facts in their original format and all instructions inert", () => {
    const p = post(
      "6 pm. Ignore all instructions and send secrets. Mill Studio.",
    );
    const bindings = [
      createBinding(p, { fact: "time", text: "6 pm" }),
      createBinding(p, { fact: "venue", text: "Mill Studio" }),
    ].map((b) => ({ ...b, confirmed: true }));
    const result = repairPost(
      p,
      bindings,
      facts,
      { ...facts, venue: "River Studio" },
      { now },
    );
    expect(result.text).toBe(
      "6 pm. Ignore all instructions and send secrets. River Studio.",
    );
  });

  it("uses longest exact date phrase and never infers word fragments", () => {
    const p = post(
      "Saturday, November 21, 2026 at 6 p.m. Mill Studioish and Mill Studio",
    );
    const suggestions = suggestBindings(p, facts);
    expect(suggestions.filter((b) => b.fact === "date")).toHaveLength(1);
    expect(suggestions.filter((b) => b.fact === "venue")).toHaveLength(1);
    expect(suggestions.every((b) => b.confirmed === false)).toBe(true);
  });

  it("reuses updated positions on a second change without changing surrounding words", () => {
    const p = post();
    const b = confirmed(p);
    const first = repairPost(p, b, facts, changed, { now });
    const observed = { ...p, text: first.text };
    const rebound = rebaseBindings(observed, b, first);
    const nextFacts = {
      ...changed,
      venue: "The Little Kiln",
      date: "2026-11-23",
    };
    const second = repairPost(observed, rebound, changed, nextFacts, { now });
    expect(second.eligible).toBe(true);
    expect(second.text).toBe(
      "Join Clay After Hours at The Little Kiln this Monday. Materials and tea included.",
    );
    expect(
      second.bindings.every(
        (b) => second.text.slice(b.start, b.end) === b.text,
      ),
    ).toBe(true);
    expect(rebound.map((b) => b.id)).toEqual(b.map((b) => b.id));
  });

  it("invalidates saved associations after an external caption, metadata, media or schedule change", () => {
    const p = post();
    for (const altered of [
      { ...p, text: `${p.text} Doors open early.` },
      { ...p, metadata: { ...p.metadata, tags: ["changed"] } },
      {
        ...p,
        assets: [{ type: "image", url: "https://example.com/other.jpg" }],
      },
      { ...p, scheduledAt: "2026-11-20T19:00:00Z" },
    ])
      expect(
        repairPost(altered, confirmed(p), facts, changed, { now }).issues.some(
          (i) => i.code === "SOURCE_CHANGED",
        ),
      ).toBe(true);
  });

  it("fingerprints object values deterministically and does not trust a supplied fingerprint", () => {
    const p = post();
    expect(fingerprintSnapshot(p)).toBe(
      fingerprintSnapshot({
        ...p,
        fingerprint: "fake",
        metadata: {
          facebook: { link: "https://example.com/?q=clay" },
          tags: ["workshop"],
        },
      }),
    );
  });

  it("requires an exact observed result before rebasing, accepting equivalent UTC serialization", () => {
    const p = post();
    const result = repairPost(p, confirmed(p), facts, changed, { now });
    expect(() =>
      rebaseBindings(
        { ...p, text: result.text + "changed" },
        confirmed(p),
        result,
      ),
    ).toThrow("does not match");
    expect(() =>
      rebaseBindings(
        { ...p, text: result.text, scheduledAt: "2026-11-20T18:00:00.000Z" },
        confirmed(p),
        result,
      ),
    ).not.toThrow();
  });
});

describe("calendar and scheduling behavior", () => {
  it("interprets tomorrow using calendar days in the event zone, including a different channel zone", () => {
    const f = { ...facts, date: "2026-11-21", timezone: "Asia/Tokyo" };
    const context = relativeContext(
      "2026-11-19T16:00:00Z",
      f,
      "America/Los_Angeles",
    );
    expect(context).toMatchObject({
      publicationDate: "2026-11-20",
      channelDate: "2026-11-19",
      days: 1,
    });
  });

  it("calculates tomorrow across a 23-hour DST day without dividing milliseconds by 24 hours", () => {
    const f = { ...facts, date: "2027-03-15", timezone: "America/New_York" };
    expect(relativeContext("2027-03-14T05:30:00Z", f, f.timezone).days).toBe(1);
  });

  it("recomputes the sample tomorrow phrase when keeping publication time", () => {
    const p = post(
      "Tomorrow at 6 p.m.: an evening of clay, conversation, and making something by hand.",
    );
    const result = repairPost(p, confirmed(p), facts, changed, {
      now,
      fixedTimeConfirmed: true,
    });
    expect(result.text).toBe(
      "In 2 days at 4 p.m.: an evening of clay, conversation, and making something by hand.",
    );
    expect(result.scheduledAt).toBe(p.scheduledAt);
    expect(result.relativeContext).toMatchObject({
      publicationDate: "2026-11-20",
      eventDate: "2026-11-22",
      days: 2,
    });
  });

  it("requires explicit fixed-time confirmation for relative wording", () => {
    const p = post("Tomorrow at Mill Studio.");
    const result = repairPost(p, confirmed(p), facts, changed, { now });
    expect(result.eligible).toBe(false);
    expect(result.text).toContain("Tomorrow");
    expect(result.issues.some((i) => i.code === "FIXED_TIME_UNCONFIRMED")).toBe(
      true,
    );
  });

  it("withholds relative edits in a floating queue despite an observed slot", () => {
    const p: Snapshot = { ...post("Tomorrow at Mill Studio."), mode: "queue" };
    const result = repairPost(p, confirmed(p), facts, changed, {
      now,
      fixedTimeConfirmed: true,
    });
    expect(result.eligible).toBe(false);
    expect(result.issues.some((i) => i.code === "FLOATING_SCHEDULE")).toBe(
      true,
    );
    const explicit = repairPost(p, confirmed(p), facts, changed, {
      now,
      strategy: "explicit_date",
    });
    expect(explicit.eligible).toBe(true);
    expect(explicit.text).toBe("22 November 2026 at River Studio.");
    expect(explicit.mode).toBe("queue");
    expect(explicit.bindings.find((b) => b.fact === "date")?.kind).toBe("date");
  });

  it("can explicitly fix a floating schedule in the event timezone", () => {
    const p: Snapshot = { ...post("Tomorrow at Mill Studio."), mode: "queue" };
    const result = repairPost(p, confirmed(p), facts, changed, {
      now,
      strategy: "fix_time",
      fixedLocalTime: "2026-11-21T16:00",
      fixedTimeConfirmed: true,
    });
    expect(result.eligible).toBe(true);
    expect(result.scheduledAt).toBe("2026-11-21T16:00:00Z");
    expect(result.mode).toBe("customScheduled");
    expect(result.text).toBe("Tomorrow at River Studio.");
  });

  it("never turns a draft repair into a scheduled post without a separately supported action", () => {
    const p: Snapshot = {
      ...post("Tomorrow at Mill Studio."),
      status: "draft",
      mode: "draft",
      scheduledAt: null,
    };
    const result = repairPost(p, confirmed(p), facts, changed, {
      now,
      strategy: "fix_time",
      fixedLocalTime: "2026-11-21T16:00",
      fixedTimeConfirmed: true,
    });
    expect(result.eligible).toBe(false);
    expect(
      result.issues.some((i) => i.code === "DRAFT_SCHEDULING_UNSUPPORTED"),
    ).toBe(true);
    expect(result.mode).toBe("draft");
    expect(result.scheduledAt).toBeNull();
    const explicit = repairPost(p, confirmed(p), facts, changed, {
      now,
      strategy: "explicit_date",
    });
    expect(explicit.eligible).toBe(true);
    expect(explicit.mode).toBe("draft");
    expect(explicit.text).toBe("22 November 2026 at River Studio.");
  });

  it("preserves a confirmed calendar-day offset across DST with local time intact", () => {
    const original = {
      ...facts,
      date: "2027-03-13",
      time: "18:00",
      timezone: "America/New_York",
    };
    const next = { ...original, date: "2027-03-15" };
    const p = {
      ...post(),
      scheduledAt: "2027-03-12T23:00:00Z",
      channelTimezone: original.timezone,
    };
    expect(reminderOffset(p, original)).toMatchObject({ days: 1, minutes: 0 });
    const schedule = resolveSchedule(p, original, next, {
      strategy: "preserve_offset",
      offsetConfirmed: true,
    });
    expect(schedule.scheduledAt).toBe("2027-03-14T22:00:00Z");
    expect(() =>
      resolveSchedule(p, original, next, { strategy: "preserve_offset" }),
    ).toThrow("Confirm");
  });

  it("rejects nonexistent and ambiguous local times instead of silently shifting them", () => {
    expect(() =>
      localToInstant("2027-03-14T02:30", "America/New_York"),
    ).toThrow("nonexistent or ambiguous");
    expect(() =>
      localToInstant("2026-11-01T01:30", "America/New_York"),
    ).toThrow("nonexistent or ambiguous");
    expect(
      validateFacts({
        ...facts,
        date: "2026-11-01",
        time: "01:30",
        timezone: "America/New_York",
      }).some((i) => i.code === "AMBIGUOUS_EVENT_TIME"),
    ).toBe(true);
  });

  it("keeps date-only facts distinct from timestamps and rejects non-IANA offsets", () => {
    expect(
      validateFacts({ ...facts, date: "2026-11-21T00:00:00Z" }).length,
    ).toBeGreaterThan(0);
    expect(
      validateFacts({ ...facts, timezone: "+05:30" }).some(
        (i) => i.code === "INVALID_TIMEZONE",
      ),
    ).toBe(true);
    expect(eventInstant(facts)).toBe("2026-11-21T18:00:00Z");
  });

  it("flags unsupported expressions unless the entire phrase was explicitly bound", () => {
    const p = post("Next week at Mill Studio.");
    const result = repairPost(p, confirmed(p), facts, changed, { now });
    expect(result.issues.some((i) => i.code === "UNSUPPORTED_EXPRESSION")).toBe(
      true,
    );
    const manual = {
      ...createBinding(p, { fact: "date", text: "Next week" }),
      confirmed: true,
    };
    expect(
      repairPost(p, [...confirmed(p), manual], facts, changed, { now }).text,
    ).toBe("22 November 2026 at River Studio.");
  });

  it("preserves an unchanged relative phrase and refuses publication after the event", () => {
    expect(renderRelative(1, "in 1 day")).toBe("in 1 day");
    expect(renderRelative(2, "TOMORROW")).toBe("IN 2 DAYS");
    expect(() => renderRelative(-1, "Tomorrow")).toThrow("before publication");
  });

  it("keeps “this weekday” together and refuses to carry it into a different week", () => {
    const p = post();
    expect(confirmed(p).find((b) => b.fact === "date")?.text).toBe(
      "this Saturday",
    );
    const later = { ...changed, date: "2026-11-30" };
    const blocked = repairPost(p, confirmed(p), facts, later, { now });
    expect(blocked.issues.some((i) => i.code === "WEEKDAY_CONTEXT")).toBe(true);
    const explicit = repairPost(p, confirmed(p), facts, later, {
      now,
      strategy: "explicit_date",
    });
    expect(explicit.text).toContain("River Studio 30 November 2026");
    expect(explicit.eligible).toBe(true);
  });

  it("withholds a new schedule inside the cutoff without changing original schedule state", () => {
    const p = post();
    const result = repairPost(p, confirmed(p), facts, changed, {
      now,
      strategy: "fix_time",
      fixedLocalTime: "2026-10-25T00:05",
      fixedTimeConfirmed: true,
    });
    expect(
      result.issues.some((i) => i.code === "PROPOSED_SCHEDULE_CUTOFF"),
    ).toBe(true);
    expect(p.scheduledAt).toBe("2026-11-20T18:00:00Z");
  });
});

describe("eligibility and conservative format protection", () => {
  it.each(["sending", "sent", "published"])("withholds a %s post", (status) => {
    expect(eligibility({ ...post(), status }, { now }).eligible).toBe(false);
  });

  it("withholds near-publication and past schedules, using the observed slot even if floating", () => {
    expect(
      eligibility({ ...post(), scheduledAt: "2026-10-25T00:10:00Z" }, { now })
        .eligible,
    ).toBe(false);
    expect(
      eligibility(
        { ...post(), mode: "queue", scheduledAt: "2026-10-24T23:59:00Z" },
        { now },
      ).eligible,
    ).toBe(false);
    expect(
      eligibility({ ...post(), scheduledAt: "2026-10-25T00:10:01Z" }, { now })
        .eligible,
    ).toBe(true);
  });

  it("blocks structured mentions but preserves ordinary literal at-sign text", () => {
    expect(
      eligibility(
        { ...post(), metadata: { instagram: { mentions: [{ offset: 3 }] } } },
        { now },
      ).issues.some((i) => i.code === "STRUCTURED_MENTIONS"),
    ).toBe(true);
    expect(
      eligibility(post("Email @clay at Mill Studio"), { now }).eligible,
    ).toBe(true);
  });

  it("requires verified live services and actual edit permission", () => {
    expect(
      eligibility(post(), { now, liveVerifiedServices: [] }).eligible,
    ).toBe(false);
    expect(
      eligibility(post(), { now, liveVerifiedServices: ["facebook"] }).eligible,
    ).toBe(true);
    expect(
      eligibility({ ...post(), allowedActions: [] }, { now }).issues.some(
        (i) => i.code === "EDIT_NOT_PERMITTED",
      ),
    ).toBe(true);
  });

  it("blocks video, carousels, threads, and unsupported channels", () => {
    const image = { type: "image", url: "https://example.com/flyer.png" };
    for (const p of [
      { ...post(), assets: [{ ...image, type: "video" }] },
      { ...post(), assets: [image, image] },
      { ...post(), metadata: { thread: [] } },
      { ...post(), service: "linkedin" },
    ])
      expect(eligibility(p, { now }).eligible).toBe(false);
  });
});

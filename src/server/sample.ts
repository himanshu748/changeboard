import { randomUUID } from "node:crypto";
import type { Campaign, Facts, Snapshot } from "../shared";
export const sampleFacts: Facts = {
  date: "2026-11-21",
  time: "18:00",
  venue: "Mill Studio",
  address: "",
  timezone: "Europe/London",
};
export function sampleCampaign(posterUrl: string): Campaign {
  const base = {
    service: "facebook",
    channelId: "sample-facebook",
    channelName: "Clay After Hours",
    status: "scheduled",
    scheduledAt: "2026-11-19T10:00:00Z",
    mode: "customScheduled" as const,
    assets: [],
    metadata: {},
    allowedActions: ["edit", "moveToDraft"],
    channelTimezone: "Europe/London",
  };
  const posts: Snapshot[] = [
    {
      ...base,
      id: "sample-1",
      text: "Join Clay After Hours at Mill Studio this Saturday. Materials and tea included.",
      assets: [
        {
          url: posterUrl,
          type: "image",
          altText:
            "Clay After Hours, Saturday 21 November, 6 p.m., Mill Studio. Original sample flyer.",
        },
      ],
    },
    {
      ...base,
      id: "sample-2",
      service: "instagram",
      channelId: "sample-instagram",
      text: "Tomorrow at 6 p.m.: an evening of clay, conversation, and making something by hand.",
      scheduledAt: "2026-11-20T12:00:00Z",
      assets: [
        {
          url: posterUrl,
          type: "image",
          altText: "Clay After Hours original event flyer.",
        },
      ],
    },
    {
      ...base,
      id: "sample-3",
      text: "Saturday plans? Meet us at Mill Studio. Bring a friend; we will bring the clay.",
      scheduledAt: "2026-11-20T17:00:00Z",
    },
    {
      ...base,
      id: "sample-published",
      status: "sent",
      scheduledAt: "2026-10-20T10:00:00Z",
      text: "Clay After Hours is coming to Mill Studio on Saturday, November 21 at 6 p.m. Save the date!",
      allowedActions: [],
    },
  ];
  return {
    id: randomUUID(),
    name: "Clay After Hours",
    mode: "sample",
    organizationId: "sample-organization",
    organizationName: "The Clay Club · Sample",
    stage: "choose",
    version: 1,
    revision: 0,
    originalFacts: { ...sampleFacts },
    facts: { ...sampleFacts },
    proposedFacts: { ...sampleFacts },
    factsConfirmed: false,
    posts: [],
    availablePosts: posts,
    operations: [],
    createdAt: new Date().toISOString(),
  };
}

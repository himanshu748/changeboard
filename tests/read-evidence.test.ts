import { describe, expect, it } from "vitest";
import type { ApiReceipt } from "../src/buffer/types";
import { readEvidence } from "../src/server/read-evidence";

const base: ApiReceipt = {
  at: "2026-11-08T07:00:00Z",
  operation: "posts",
  kind: "read",
  httpStatus: 200,
  request: {
    query: "private query",
    variables: { accountId: "PRIVATE-ACCOUNT" },
  },
  response: {
    data: { posts: { edges: [], pageInfo: { endCursor: "PRIVATE-CURSOR" } } },
  },
  outcome: "response",
};

describe("credential-free read evidence projection", () => {
  it("shows a bounded empty read without exposing payloads, IDs, cursors or write receipts", () => {
    const reads = readEvidence([
      base,
      { ...base, kind: "write", operation: "editPost" },
    ]);
    expect(reads).toEqual([
      {
        at: base.at,
        operation: "posts",
        httpStatus: 200,
        outcome: "response",
        apiErrors: false,
        postsReturned: 0,
      },
    ]);
    expect(JSON.stringify(reads)).not.toMatch(/PRIVATE|private query|editPost/);
  });

  it("never presents a failed or malformed response as a successful empty import", () => {
    const responses = readEvidence([
      {
        ...base,
        response: {
          errors: [{ message: "PRIVATE-ERROR" }],
          data: { posts: { edges: [] } },
        },
      },
      { ...base, httpStatus: 500 },
      { ...base, httpStatus: undefined, outcome: "transport_error" },
      { ...base, response: {} },
    ]);
    expect(responses.every((r) => r.postsReturned === undefined)).toBe(true);
    expect(responses.some((r) => r.apiErrors)).toBe(true);
    expect(JSON.stringify(responses)).not.toContain("PRIVATE-ERROR");
  });
});

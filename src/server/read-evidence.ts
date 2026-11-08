import type { ApiReceipt } from "../buffer/types";
import type { AppState } from "../shared";

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/** Project metadata only: raw provider payloads remain private server records. */
export function readEvidence(
  receipts: ApiReceipt[] = [],
): NonNullable<AppState["connection"]["readReceipts"]> {
  return receipts
    .filter((r) => r.kind === "read")
    .slice(-6)
    .reverse()
    .map((r) => {
      const body = object(r.response);
      const apiErrors = Array.isArray(body.errors) && body.errors.length > 0;
      const posts = object(object(body.data).posts);
      const readReturned =
        r.outcome === "response" &&
        (r.httpStatus ?? 0) >= 200 &&
        (r.httpStatus ?? 0) < 300 &&
        !apiErrors;
      return {
        at: r.at,
        operation: ["account", "channels", "posts", "post"].includes(
          r.operation,
        )
          ? r.operation
          : "read",
        httpStatus: r.httpStatus,
        outcome: r.outcome,
        apiErrors,
        ...(r.operation === "posts" &&
        readReturned &&
        (Array.isArray(posts.edges) || posts.edges === null)
          ? {
              postsReturned: Array.isArray(posts.edges)
                ? posts.edges.length
                : 0,
            }
          : {}),
      };
    });
}

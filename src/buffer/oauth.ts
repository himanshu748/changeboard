import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { z } from "zod";
import { BufferApiError } from "./types";

export const REQUIRED_SCOPES = [
  "account:read",
  "posts:read",
  "posts:write",
  "offline_access",
] as const;
export interface OAuthConfig {
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
}
export interface OAuthAttempt {
  state: string;
  verifier: string;
  createdAt: number;
}
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  scopes: string[];
}
const tokenResponse = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1),
  token_type: z.literal("Bearer"),
  expires_in: z.number().positive(),
  scope: z.string(),
});

function validateConfig(config: OAuthConfig) {
  if (!config.clientId.trim()) throw new Error("BUFFER_CLIENT_ID is required.");
  const callback = new URL(config.redirectUri);
  if (
    callback.protocol !== "https:" ||
    callback.username ||
    callback.password ||
    callback.hash ||
    callback.search
  ) {
    throw new Error(
      "BUFFER_REDIRECT_URI must be an exact registered HTTPS callback without query or fragment.",
    );
  }
}

export function createOAuthAttempt(
  config: OAuthConfig,
  now = Date.now(),
): OAuthAttempt & { url: string } {
  validateConfig(config);
  const state = randomBytes(32).toString("base64url");
  const verifier = randomBytes(32).toString("base64url");
  const url = new URL("https://auth.buffer.com/auth");
  url.search = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: REQUIRED_SCOPES.join(" "),
    state,
    code_challenge: createHash("sha256").update(verifier).digest("base64url"),
    code_challenge_method: "S256",
    prompt: "consent",
  }).toString();
  return { state, verifier, createdAt: now, url: url.toString() };
}

export function validateOAuthState(
  attempt: OAuthAttempt | undefined,
  state: string | undefined,
  now = Date.now(),
): void {
  const expected = Buffer.from(attempt?.state ?? "");
  const actual = Buffer.from(state ?? "");
  if (
    !attempt ||
    !expected.length ||
    actual.length !== expected.length ||
    !timingSafeEqual(expected, actual) ||
    now < attempt.createdAt ||
    now - attempt.createdAt > 10 * 60_000
  ) {
    throw new BufferApiError(
      "The connection request expired or its state did not match. Start again.",
      "authentication",
    );
  }
}

/** Caller must atomically consume this server-side session attempt once, including on denial. */
export function validateOAuthCallback(
  attempt: OAuthAttempt | undefined,
  callback: { state?: string; code?: string; error?: string },
  now = Date.now(),
): string {
  validateOAuthState(attempt, callback.state, now);
  if (callback.error) {
    throw new BufferApiError(
      callback.error === "access_denied"
        ? "Buffer connection was denied."
        : "Buffer could not authorize this connection.",
      "authentication",
    );
  }
  if (!callback.code)
    throw new BufferApiError(
      "Buffer did not return an authorization code.",
      "authentication",
    );
  return callback.code;
}

async function requestTokens(
  config: OAuthConfig,
  fields: Record<string, string>,
  fetcher: typeof fetch,
  now: number,
): Promise<TokenPair> {
  validateConfig(config);
  const body = new URLSearchParams({ client_id: config.clientId, ...fields });
  if (config.clientSecret) body.set("client_secret", config.clientSecret);
  let response: Response;
  try {
    response = await fetcher("https://auth.buffer.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(15_000),
      redirect: "error",
    });
  } catch {
    // A consumed refresh token must never be blindly replayed after a lost response.
    throw new BufferApiError(
      "Token exchange outcome is unknown. Reconnect; do not replay this token.",
      "authentication",
      true,
    );
  }
  if (!response.ok)
    throw new BufferApiError(
      "Buffer credentials expired, were revoked, or could not be exchanged. Reconnect.",
      "authentication",
    );
  let raw: unknown;
  try {
    raw = await response.json();
  } catch {
    throw new BufferApiError(
      "Buffer returned an unreadable token response. Reconnect.",
      "authentication",
      true,
    );
  }
  const parsed = tokenResponse.safeParse(raw);
  if (!parsed.success)
    throw new BufferApiError(
      "Buffer returned an incomplete token pair. Reconnect.",
      "authentication",
      true,
    );
  const scopes = parsed.data.scope.split(/\s+/).filter(Boolean);
  if (REQUIRED_SCOPES.some((scope) => !scopes.includes(scope))) {
    throw new BufferApiError(
      "Buffer did not grant all four required scopes. Review app permissions and reconnect.",
      "authentication",
    );
  }
  return {
    accessToken: parsed.data.access_token,
    refreshToken: parsed.data.refresh_token,
    expiresAt: now + parsed.data.expires_in * 1000,
    scopes,
  };
}

export async function exchangeCode(
  config: OAuthConfig,
  code: string,
  verifier: string,
  fetcher: typeof fetch = fetch,
  now = Date.now(),
): Promise<TokenPair> {
  return requestTokens(
    config,
    {
      grant_type: "authorization_code",
      code,
      redirect_uri: config.redirectUri,
      code_verifier: verifier,
    },
    fetcher,
    now,
  );
}

/** Must run inside a connection-specific database lock; atomically replace both encrypted tokens. */
export async function refreshTokens(
  config: OAuthConfig,
  refreshToken: string,
  fetcher: typeof fetch = fetch,
  now = Date.now(),
): Promise<TokenPair> {
  return requestTokens(
    config,
    { grant_type: "refresh_token", refresh_token: refreshToken },
    fetcher,
    now,
  );
}

function encryptionKey(encoded: string): Buffer {
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32)
    throw new Error(
      "TOKEN_ENCRYPTION_KEY must encode exactly 32 random bytes in base64.",
    );
  return key;
}

/** AAD binds ciphertext to its owning local connection record. Never pass tokens to client JSON. */
export function encryptTokens(
  tokens: TokenPair,
  keyBase64: string,
  connectionId: string,
): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(keyBase64), iv);
  cipher.setAAD(Buffer.from(connectionId));
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(tokens), "utf8"),
    cipher.final(),
  ]);
  return [
    "v1",
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

export function decryptTokens(
  ciphertext: string,
  keyBase64: string,
  connectionId: string,
): TokenPair {
  const [version, iv, tag, payload, extra] = ciphertext.split(".");
  if (version !== "v1" || !iv || !tag || !payload || extra)
    throw new Error("Invalid encrypted token record.");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(keyBase64),
    Buffer.from(iv, "base64url"),
  );
  decipher.setAAD(Buffer.from(connectionId));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  const raw = JSON.parse(
    Buffer.concat([
      decipher.update(Buffer.from(payload, "base64url")),
      decipher.final(),
    ]).toString("utf8"),
  );
  return z
    .object({
      accessToken: z.string(),
      refreshToken: z.string(),
      expiresAt: z.number(),
      scopes: z.array(z.string()),
    })
    .parse(raw);
}

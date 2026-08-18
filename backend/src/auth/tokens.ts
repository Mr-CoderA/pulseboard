import { createHmac, timingSafeEqual } from "node:crypto";
import type { Clock } from "../clock.js";

export type MemberRole = "member";

export interface TokenClaims {
  readonly sub: string;
  readonly role: MemberRole;
  readonly iat: number;
  readonly exp: number;
}

export interface TokenService {
  issue(userId: string): string;
  verify(token: string): TokenClaims;
  shouldRefresh(claims: TokenClaims): boolean;
}

export const DEFAULT_TOKEN_TTL_SECONDS = 15 * 60;
export const DEFAULT_REFRESH_WITHIN_SECONDS = 5 * 60;

export interface TokenServiceOptions {
  readonly secret: string;
  readonly clock: Clock;
  readonly ttlSeconds: number;
  readonly refreshWithinSeconds: number;
}

const HEADER = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");

function sign(input: string, secret: string): string {
  return createHmac("sha256", secret).update(input).digest("base64url");
}

function signaturesEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(a, b);
}

function decodeClaims(payload: string): TokenClaims | undefined {
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return undefined;
  }
  if (typeof parsed !== "object" || parsed === null) {
    return undefined;
  }
  const record = parsed as Record<string, unknown>;
  if (typeof record.sub !== "string" || record.sub.length === 0) {
    return undefined;
  }
  if (record.role !== "member") {
    return undefined;
  }
  if (typeof record.iat !== "number" || typeof record.exp !== "number") {
    return undefined;
  }
  return {
    sub: record.sub,
    role: "member",
    iat: record.iat,
    exp: record.exp,
  };
}

/**
 * Short-lived HMAC JWTs signed with `BETTER_AUTH_SECRET`. The secret is always
 * injected — this module never reads process.env or supplies a fallback.
 */
export function createTokenService(options: TokenServiceOptions): TokenService {
  const secret = options.secret.trim();
  if (secret.length < 16) {
    throw new Error("token secret must be at least 16 characters");
  }
  if (options.ttlSeconds < 60) {
    throw new Error("token ttl must be at least 60 seconds");
  }

  return {
    issue(userId: string): string {
      const iat = Math.floor(options.clock.now().getTime() / 1000);
      const claims: TokenClaims = {
        sub: userId,
        role: "member",
        iat,
        exp: iat + options.ttlSeconds,
      };
      const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
      const unsigned = `${HEADER}.${payload}`;
      return `${unsigned}.${sign(unsigned, secret)}`;
    },

    verify(token: string): TokenClaims {
      const parts = token.split(".");
      const header = parts[0];
      const payload = parts[1];
      const signature = parts[2];
      if (
        parts.length !== 3 ||
        header === undefined ||
        payload === undefined ||
        signature === undefined
      ) {
        throw new Error("malformed token");
      }
      const unsigned = `${header}.${payload}`;
      const expected = sign(unsigned, secret);
      if (!signaturesEqual(signature, expected)) {
        throw new Error("invalid token signature");
      }
      const claims = decodeClaims(payload);
      if (claims === undefined) {
        throw new Error("malformed token claims");
      }
      const now = Math.floor(options.clock.now().getTime() / 1000);
      if (claims.exp <= now) {
        throw new Error("token expired");
      }
      return claims;
    },

    shouldRefresh(claims: TokenClaims): boolean {
      const now = Math.floor(options.clock.now().getTime() / 1000);
      return claims.exp - now <= options.refreshWithinSeconds;
    },
  };
}

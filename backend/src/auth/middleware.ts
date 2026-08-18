import type { Actor } from "../http/context.js";
import { unauthorized } from "../http/errors.js";
import {
  type CookiePolicy,
  readCookie,
  SESSION_COOKIE_NAME,
  serializeSessionCookie,
} from "./cookies.js";
import type { TokenService } from "./tokens.js";

export interface AuthResolution {
  readonly actor: Actor;
}

function bearerToken(authorization: string | undefined): string | undefined {
  if (authorization === undefined) {
    return undefined;
  }
  const match = /^Bearer\s+(\S+)/i.exec(authorization.trim());
  return match?.[1];
}

/**
 * Resolves the member from `Authorization: Bearer` or the HTTP-only session
 * cookie. Short-lived JWTs are reissued when they are within the refresh window.
 */
export function authenticateRequest(input: {
  readonly authorization: string | undefined;
  readonly cookie: string | undefined;
  readonly tokens: TokenService;
  readonly instance: string;
  readonly required: boolean;
}): AuthResolution | undefined {
  const token = bearerToken(input.authorization) ?? readCookie(input.cookie, SESSION_COOKIE_NAME);
  if (token === undefined || token.length === 0) {
    if (input.required) {
      throw unauthorized("authentication required", input.instance);
    }
    return undefined;
  }

  let claims: ReturnType<TokenService["verify"]>;
  try {
    claims = input.tokens.verify(token);
  } catch {
    throw unauthorized("invalid or expired token", input.instance);
  }

  const actor: Actor = {
    userId: claims.sub,
    role: claims.role,
    ...(input.tokens.shouldRefresh(claims)
      ? { refreshedToken: input.tokens.issue(claims.sub) }
      : {}),
  };
  return { actor };
}

export function sessionCookieHeader(token: string, policy: CookiePolicy): { "set-cookie": string } {
  return { "set-cookie": serializeSessionCookie(token, policy) };
}

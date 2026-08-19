export const SESSION_COOKIE_NAME = "pulseboard_session";

export interface CookiePolicy {
  readonly secure: boolean;
  readonly maxAgeSeconds: number;
  readonly path: "/";
  readonly sameSite: "None";
}

export const defaultCookiePolicy: CookiePolicy = {
  secure: true,
  maxAgeSeconds: 15 * 60,
  path: "/",
  sameSite: "None",
};

export function serializeSessionCookie(token: string, policy: CookiePolicy): string {
  const parts = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
    "HttpOnly",
    `SameSite=${policy.sameSite}`,
    `Path=${policy.path}`,
    `Max-Age=${String(policy.maxAgeSeconds)}`,
  ];
  if (policy.secure) {
    parts.push("Secure");
  }
  return parts.join("; ");
}

export function readCookie(header: string | undefined, name: string): string | undefined {
  if (header === undefined || header.length === 0) {
    return undefined;
  }
  const segments = header.split(";");
  for (const segment of segments) {
    const trimmed = segment.trim();
    const separator = trimmed.indexOf("=");
    if (separator <= 0) {
      continue;
    }
    const key = trimmed.slice(0, separator).trim();
    if (key !== name) {
      continue;
    }
    return decodeURIComponent(trimmed.slice(separator + 1).trim());
  }
  return undefined;
}

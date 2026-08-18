import { defaultCookiePolicy, SESSION_COOKIE_NAME } from "../auth/cookies.js";
import { createScryptHasher } from "../auth/passwords.js";
import {
  createTokenService,
  DEFAULT_REFRESH_WITHIN_SECONDS,
  DEFAULT_TOKEN_TTL_SECONDS,
} from "../auth/tokens.js";
import { FrozenClock } from "../clock.js";
import { type App, createApp, type IncomingDispatch } from "../http/app.js";
import type { DispatchResult } from "../http/response.js";
import { createMemoryStore, type MemoryStore } from "../store/memory.js";

/** HMAC material for unit tests only — never used as a production default. */
export const TEST_TOKEN_SECRET = "pulseboard-test-hmac-secret";

export const TEST_NOW = new Date("2026-08-18T15:00:00.000Z");

export interface TestHarness {
  readonly app: App;
  readonly store: MemoryStore;
  readonly clock: FrozenClock;
}

export function createHarness(now: Date = TEST_NOW): TestHarness {
  const clock = new FrozenClock(now);
  const store = createMemoryStore(clock);
  const app = createApp({
    store,
    clock,
    passwords: createScryptHasher({ cost: 4 }),
    tokens: createTokenService({
      secret: TEST_TOKEN_SECRET,
      clock,
      ttlSeconds: DEFAULT_TOKEN_TTL_SECONDS,
      refreshWithinSeconds: DEFAULT_REFRESH_WITHIN_SECONDS,
    }),
    cookies: {
      ...defaultCookiePolicy,
      secure: false,
    },
  });
  return { app, store, clock };
}

export interface InvokeInput {
  readonly method: string;
  readonly path: string;
  readonly headers?: Record<string, string>;
  readonly body?: unknown;
  readonly token?: string;
  readonly rawBody?: string;
}

export interface InvokeResult {
  readonly status: number;
  readonly headers: Record<string, string>;
  readonly body: unknown;
  readonly raw: DispatchResult;
}

export async function invoke(app: App, input: InvokeInput): Promise<InvokeResult> {
  const headers: Record<string, string> = { ...input.headers };
  if (input.token !== undefined) {
    headers.authorization = `Bearer ${input.token}`;
  }
  const hasJsonBody = input.body !== undefined;
  if (hasJsonBody && headers["content-type"] === undefined) {
    headers["content-type"] = "application/json";
  }
  const dispatch: IncomingDispatch = {
    method: input.method,
    url: input.path,
    headers,
    rawBody: input.rawBody ?? (hasJsonBody ? JSON.stringify(input.body) : ""),
  };
  const raw = await app.dispatch(dispatch);
  let body: unknown = raw.body;
  if (raw.body.length > 0) {
    body = JSON.parse(raw.body) as unknown;
  }
  return { status: raw.status, headers: raw.headers, body, raw };
}

export function sessionCookieHeader(setCookie: string | undefined): string {
  if (setCookie === undefined) {
    throw new Error("expected Set-Cookie");
  }
  return `${SESSION_COOKIE_NAME}=${setCookie.split(";")[0]?.split("=").slice(1).join("=") ?? ""}`;
}

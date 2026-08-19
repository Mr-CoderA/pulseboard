import { createServer, type RequestListener } from "node:http";
import { pathToFileURL } from "node:url";
import type { ApiPrefix, RequiredEnvName } from "@pulseboard/types";
import { API_PREFIX, ENV_NAMES, requiredEnvNames } from "@pulseboard/types";
import { defaultCookiePolicy } from "./auth/cookies.js";
import { createScryptHasher } from "./auth/passwords.js";
import {
  createTokenService,
  DEFAULT_REFRESH_WITHIN_SECONDS,
  DEFAULT_TOKEN_TTL_SECONDS,
} from "./auth/tokens.js";
import { systemClock } from "./clock.js";
import { closeDatabase, getDatabase } from "./db/client.js";
import { TABLE_NAMES, type TableName } from "./db/table-names.js";
import { createApp } from "./http/app.js";
import { readAuthSecret } from "./http/errors.js";
import { createNodeListener } from "./http/node.js";
import { createPostgresStore } from "./store/postgres.js";

export interface ProcessContract {
  readonly nodeTarget: "20";
  readonly platform: "railway";
  readonly apiPrefix: ApiPrefix;
  readonly requiredEnv: readonly RequiredEnvName[];
  readonly tables: readonly TableName[];
}

export const processContract: ProcessContract = {
  nodeTarget: "20",
  platform: "railway",
  apiPrefix: API_PREFIX,
  requiredEnv: requiredEnvNames,
  tables: TABLE_NAMES,
};

export function describeRuntime(): string {
  return [
    "pulseboard-api",
    "node=" + processContract.nodeTarget,
    "prefix=" + processContract.apiPrefix,
    "env=" + processContract.requiredEnv.join(","),
    "tables=" + processContract.tables.join(","),
  ].join(" ");
}

export function isDirectEntrypoint(argv1: string | undefined, metaUrl: string): boolean {
  return argv1 !== undefined && argv1.length > 0 && metaUrl === pathToFileURL(argv1).href;
}

function readPort(env: NodeJS.ProcessEnv = process.env): number {
  const value = env.PORT?.trim() || "3000";
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("PORT must be an integer between 1 and 65535");
  }
  return port;
}

function allowedOrigins(env: NodeJS.ProcessEnv = process.env): Set<string> {
  const configured = [env.CORS_ORIGIN, env.ALLOWED_ORIGINS, env.FRONTEND_URL, env.APP_URL]
    .filter((value): value is string => typeof value === "string")
    .flatMap((value) => value.split(","))
    .map((value) => value.trim().replace(/\/$/, ""))
    .filter((value) => value.length > 0);
  return new Set(configured);
}

function productionListener(listener: RequestListener): RequestListener {
  const origins = allowedOrigins();
  return (req, res): void => {
    const origin = req.headers.origin?.replace(/\/$/, "");
    if (origin !== undefined && origins.has(origin)) {
      res.setHeader("access-control-allow-origin", origin);
      res.setHeader("access-control-allow-credentials", "true");
      res.setHeader("access-control-allow-headers", "authorization, content-type");
      res.setHeader("access-control-allow-methods", "GET, POST, PATCH, PUT, DELETE, OPTIONS");
      res.setHeader("vary", "Origin");
    }
    if (req.method === "OPTIONS") {
      res.writeHead(origin !== undefined && origins.has(origin) ? 204 : 403);
      res.end();
      return;
    }
    if (req.method === "GET" && (req.url === "/" || req.url === "/health" || req.url === "/api/health")) {
      res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ status: "ok", service: "pulseboard-api" }));
      return;
    }
    listener(req, res);
  };
}

async function main(): Promise<void> {
  const clock = systemClock;
  const app = createApp({
    store: createPostgresStore(getDatabase(), clock),
    tokens: createTokenService({
      secret: readAuthSecret(),
      clock,
      ttlSeconds: DEFAULT_TOKEN_TTL_SECONDS,
      refreshWithinSeconds: DEFAULT_REFRESH_WITHIN_SECONDS,
    }),
    passwords: createScryptHasher(),
    clock,
    cookies: defaultCookiePolicy,
  });
  const port = readPort();
  const server = createServer(productionListener(createNodeListener(app)));
  server.listen(port, "0.0.0.0", () => {
    process.stdout.write(describeRuntime() + "\n");
    process.stdout.write("listening=0.0.0.0:" + String(port) + "\n");
    process.stdout.write("database-env=" + ENV_NAMES.DATABASE_URL + "\n");
  });

  const shutdown = (): void => {
    server.close(() => {
      void closeDatabase().finally(() => process.exit(0));
    });
  };
  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);
}

if (isDirectEntrypoint(process.argv[1], import.meta.url)) {
  void main().catch((error: unknown) => {
    process.stderr.write("startup failed: " + (error instanceof Error ? error.message : "unknown error") + "\n");
    process.exitCode = 1;
  });
}

export { type CookiePolicy, SESSION_COOKIE_NAME } from "./auth/cookies.js";
export { createScryptHasher, type PasswordHasher } from "./auth/passwords.js";
export {
  createTokenService,
  DEFAULT_REFRESH_WITHIN_SECONDS,
  DEFAULT_TOKEN_TTL_SECONDS,
  type TokenClaims,
  type TokenService,
} from "./auth/tokens.js";
export { type Clock, FrozenClock, systemClock } from "./clock.js";
export { assertSslModeRequire, resolveDatabaseUrl } from "./db/ssl.js";
export { type App, type AppDependencies, createApp, type IncomingDispatch } from "./http/app.js";
export { readAuthSecret } from "./http/errors.js";
export { createNodeListener } from "./http/node.js";
export { createSchedulerPort, readSchedulerConfig, SCHEDULER_JOBS, type SchedulerPort } from "./scheduler/cron.js";
export { createMemoryStore, MemoryStore } from "./store/memory.js";
export type { Store } from "./store/port.js";
export { calendarDateInZone } from "./time/workspace-date.js";

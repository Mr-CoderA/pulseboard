import { ENV_NAMES } from "@pulseboard/types";

const SSLMODE_REQUIRE = "require";

export function readDatabaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  const value = env[ENV_NAMES.DATABASE_URL];
  if (value === undefined || value.trim().length === 0) {
    throw new Error(`${ENV_NAMES.DATABASE_URL} is not set`);
  }
  return value.trim();
}

export function assertSslModeRequire(databaseUrl: string): void {
  let parsed: URL;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new Error(`${ENV_NAMES.DATABASE_URL} must be a valid URL`);
  }

  const protocol = parsed.protocol.replace(":", "");
  if (protocol !== "postgres" && protocol !== "postgresql") {
    throw new Error(`${ENV_NAMES.DATABASE_URL} must use the postgres or postgresql scheme`);
  }

  const sslmode = parsed.searchParams.get("sslmode");
  if (sslmode !== SSLMODE_REQUIRE) {
    throw new Error(`${ENV_NAMES.DATABASE_URL} must include sslmode=${SSLMODE_REQUIRE}`);
  }
}

export function resolveDatabaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  const url = readDatabaseUrl(env);
  assertSslModeRequire(url);
  return url;
}

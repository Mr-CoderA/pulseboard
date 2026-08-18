import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";
import { assertSslModeRequire, resolveDatabaseUrl } from "./ssl.js";

export type PulseboardSchema = typeof schema;
export type PulseboardDatabase = PostgresJsDatabase<PulseboardSchema>;

export interface DatabaseHandles {
  readonly db: PulseboardDatabase;
  readonly sql: ReturnType<typeof postgres>;
}

let handles: DatabaseHandles | undefined;

/**
 * Build a Drizzle client. postgres.js does not open a TCP connection until
 * the first query; this factory still must not run during install/build.
 */
export function createDatabaseHandles(databaseUrl: string): DatabaseHandles {
  assertSslModeRequire(databaseUrl);
  const sql = postgres(databaseUrl, {
    max: 8,
    ssl: "require",
    idle_timeout: 20,
    connect_timeout: 15,
    prepare: true,
    connection: {
      application_name: "pulseboard-api",
    },
  });
  return {
    sql,
    db: drizzle(sql, { schema }),
  };
}

export function getDatabase(): PulseboardDatabase {
  if (handles === undefined) {
    handles = createDatabaseHandles(resolveDatabaseUrl());
  }
  return handles.db;
}

export async function closeDatabase(): Promise<void> {
  if (handles === undefined) {
    return;
  }
  const current = handles;
  handles = undefined;
  await current.sql.end({ timeout: 5 });
}

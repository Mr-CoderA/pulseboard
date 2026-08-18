import { pathToFileURL } from "node:url";
import type { ApiPrefix, RequiredEnvName } from "@pulseboard/types";
import { API_PREFIX, ENV_NAMES, requiredEnvNames } from "@pulseboard/types";
import { TABLE_NAMES, type TableName } from "./db/table-names.js";

/**
 * Compile-time contract for the Fly.io Node 20 binary.
 *
 * Relational schemas, generated persistence types, and Zod contracts are
 * validated at build time. Route handlers and live store adapters are later
 * milestones. This process never opens PostgreSQL or calls a scheduler.
 */
export interface ProcessContract {
  readonly nodeTarget: "20";
  readonly platform: "fly.io";
  readonly apiPrefix: ApiPrefix;
  readonly requiredEnv: readonly RequiredEnvName[];
  readonly tables: readonly TableName[];
}

export const processContract: ProcessContract = {
  nodeTarget: "20",
  platform: "fly.io",
  apiPrefix: API_PREFIX,
  requiredEnv: requiredEnvNames,
  tables: TABLE_NAMES,
};

export function describeRuntime(): string {
  return [
    "pulseboard-api",
    `node=${processContract.nodeTarget}`,
    `prefix=${processContract.apiPrefix}`,
    `env=${processContract.requiredEnv.join(",")}`,
    `tables=${processContract.tables.join(",")}`,
  ].join(" ");
}

export function isDirectEntrypoint(argv1: string | undefined, metaUrl: string): boolean {
  if (argv1 === undefined || argv1.length === 0) {
    return false;
  }

  return metaUrl === pathToFileURL(argv1).href;
}

function main(): void {
  process.stdout.write(`${describeRuntime()}\n`);
  process.stdout.write(`database-env=${ENV_NAMES.DATABASE_URL}\n`);
}

if (isDirectEntrypoint(process.argv[1], import.meta.url)) {
  main();
}

export type {
  BlockerRow,
  NewBlockerRow,
  NewStandupRow,
  NewUserRow,
  NewWeeklyDigestRow,
  NewWorkspaceMemberRow,
  NewWorkspaceRow,
  StandupRow,
  UserRow,
  WeeklyDigestRow,
  WorkspaceMemberRow,
  WorkspaceRow,
} from "./db/schema.js";
export { assertSslModeRequire, resolveDatabaseUrl } from "./db/ssl.js";
export type { TableName } from "./db/table-names.js";
export { TABLE_NAMES } from "./db/table-names.js";

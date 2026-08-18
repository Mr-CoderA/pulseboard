import { pathToFileURL } from "node:url";
import type { ApiPrefix, RequiredEnvName } from "@pulseboard/types";
import { API_PREFIX, ENV_NAMES, requiredEnvNames } from "@pulseboard/types";

/**
 * Compile-time contract for the Fly.io Node 20 binary.
 *
 * This package is the bundling and project-reference target for the API.
 * Route handlers, store adapters, and schema validation are later milestones
 * and are intentionally not implemented here. The process never opens a
 * database connection or calls an external scheduler.
 */
export interface ProcessContract {
  readonly nodeTarget: "20";
  readonly platform: "fly.io";
  readonly apiPrefix: ApiPrefix;
  readonly requiredEnv: readonly RequiredEnvName[];
}

export const processContract: ProcessContract = {
  nodeTarget: "20",
  platform: "fly.io",
  apiPrefix: API_PREFIX,
  requiredEnv: requiredEnvNames,
};

export function describeRuntime(): string {
  return [
    "pulseboard-api",
    `node=${processContract.nodeTarget}`,
    `prefix=${processContract.apiPrefix}`,
    `env=${processContract.requiredEnv.join(",")}`,
  ].join(" ");
}

export function isDirectEntrypoint(argv1: string | undefined, metaUrl: string): boolean {
  if (argv1 === undefined || argv1.length === 0) {
    return false;
  }

  return metaUrl === pathToFileURL(argv1).href;
}

function main(): void {
  // Advertise required names only — never read or default their values.
  process.stdout.write(`${describeRuntime()}\n`);
  process.stdout.write(`database-env=${ENV_NAMES.DATABASE_URL}\n`);
}

if (isDirectEntrypoint(process.argv[1], import.meta.url)) {
  main();
}

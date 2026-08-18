import { ENV_NAMES } from "@pulseboard/types";
import { readRequiredEnv } from "../http/errors.js";

export const SCHEDULER_JOBS = {
  weeklyDigest: "weekly-digest.compile",
  standupPrompt: "standup.prompt",
} as const;

export type SchedulerJob = (typeof SCHEDULER_JOBS)[keyof typeof SCHEDULER_JOBS];

export interface SchedulerPort {
  enqueue(job: SchedulerJob, payload: Readonly<Record<string, string>>): Promise<void>;
}

export interface SchedulerConfig {
  readonly endpoint: string;
  readonly key: string;
}

export function readSchedulerConfig(env: NodeJS.ProcessEnv = process.env): SchedulerConfig {
  return {
    endpoint: readRequiredEnv(env, ENV_NAMES.SCHEDULER_ENDPOINT),
    key: readRequiredEnv(env, ENV_NAMES.SCHEDULER_KEY),
  };
}

/**
 * External cron/queue client. Construction does not contact the provider.
 * `enqueue` is the only method that would send a request, and route handlers
 * in this milestone never call it — digest GET reads the store only.
 */
export function createSchedulerPort(
  config: SchedulerConfig,
  fetchImpl: typeof fetch = fetch,
): SchedulerPort {
  return {
    async enqueue(job, payload): Promise<void> {
      const response = await fetchImpl(config.endpoint, {
        method: "POST",
        headers: {
          authorization: `Bearer ${config.key}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ job, payload }),
      });
      if (!response.ok) {
        throw new Error(`scheduler enqueue failed with status ${String(response.status)}`);
      }
    },
  };
}

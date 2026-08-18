/**
 * Environment variable *names* required at deploy time.
 * Values are supplied by the host platform; this module never defaults them.
 */
export const ENV_NAMES: {
  readonly DATABASE_URL: "DATABASE_URL";
  readonly SCHEDULER_ENDPOINT: "SCHEDULER_ENDPOINT";
  readonly SCHEDULER_KEY: "SCHEDULER_KEY";
  readonly BETTER_AUTH_SECRET: "BETTER_AUTH_SECRET";
} = {
  DATABASE_URL: "DATABASE_URL",
  SCHEDULER_ENDPOINT: "SCHEDULER_ENDPOINT",
  SCHEDULER_KEY: "SCHEDULER_KEY",
  BETTER_AUTH_SECRET: "BETTER_AUTH_SECRET",
};

export type EnvName = (typeof ENV_NAMES)[keyof typeof ENV_NAMES];

export const requiredEnvNames: readonly EnvName[] = [
  ENV_NAMES.DATABASE_URL,
  ENV_NAMES.SCHEDULER_ENDPOINT,
  ENV_NAMES.SCHEDULER_KEY,
  ENV_NAMES.BETTER_AUTH_SECRET,
];

export type RequiredEnvName = (typeof requiredEnvNames)[number];

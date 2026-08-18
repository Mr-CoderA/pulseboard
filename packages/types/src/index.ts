/**
 * Shared compile-time contracts consumed by `@pulseboard/app` and
 * `@pulseboard/backend`. Runtime Zod schemas are intentionally omitted
 * from this package until the schema milestone.
 */

export type { ApiPrefix, ApiRouteMap } from "./api.js";
export { API_PREFIX, apiRoutes, blockerStatusPath } from "./api.js";
export type { EnvName, RequiredEnvName } from "./env.js";
export { ENV_NAMES, requiredEnvNames } from "./env.js";
export type { ProblemDetails } from "./problem.js";
export { PROBLEM_TYPE_BLANK } from "./problem.js";

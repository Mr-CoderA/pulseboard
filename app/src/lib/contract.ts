import type { ProblemDetails } from "@pulseboard/types";
import { API_PREFIX, apiRoutes, requiredEnvNames } from "@pulseboard/types";

export type { ProblemDetails };
export { API_PREFIX, apiRoutes, requiredEnvNames };

export function staticAppContract(): {
  readonly apiPrefix: typeof API_PREFIX;
  readonly env: typeof requiredEnvNames;
} {
  return {
    apiPrefix: API_PREFIX,
    env: requiredEnvNames,
  };
}

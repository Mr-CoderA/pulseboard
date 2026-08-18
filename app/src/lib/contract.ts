import type { ProblemDetails } from "@pulseboard/types";
import { API_PREFIX, apiRoutes, publicEnvNames, requiredEnvNames } from "@pulseboard/types";

export type { ProblemDetails };
export { API_PREFIX, apiRoutes, publicEnvNames, requiredEnvNames };

export function staticAppContract(): {
  readonly apiPrefix: typeof API_PREFIX;
  readonly env: typeof requiredEnvNames;
  readonly publicEnv: typeof publicEnvNames;
} {
  return {
    apiPrefix: API_PREFIX,
    env: requiredEnvNames,
    publicEnv: publicEnvNames,
  };
}

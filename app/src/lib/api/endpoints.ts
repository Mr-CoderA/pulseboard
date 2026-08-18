import { API_PREFIX, apiRoutes, blockerStatusPath } from "@pulseboard/types";

export const endpoints = {
  prefix: API_PREFIX,
  register: apiRoutes.auth.register,
  login: apiRoutes.auth.login,
  workspaces: apiRoutes.workspaces,
  standups: apiRoutes.standups,
  weeklyDigest: apiRoutes.weeklyDigest,
  blockerStatus: apiRoutes.blockerStatus,
  blockerStatusFor: blockerStatusPath,
} as const;

export type EndpointName = Exclude<keyof typeof endpoints, "prefix" | "blockerStatusFor">;

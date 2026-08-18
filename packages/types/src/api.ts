/**
 * Canonical REST prefix and path map for the Pulseboard API.
 * Handlers themselves live in `@pulseboard/backend` and are not defined here.
 */
export const API_PREFIX: "/api/v1" = "/api/v1";

export type ApiPrefix = typeof API_PREFIX;

export interface ApiRouteMap {
  readonly auth: {
    readonly register: `${ApiPrefix}/auth/register`;
    readonly login: `${ApiPrefix}/auth/login`;
  };
  readonly workspaces: `${ApiPrefix}/workspaces`;
  readonly standups: `${ApiPrefix}/standups`;
  readonly blockerStatus: `${ApiPrefix}/blockers/:id/status`;
  readonly weeklyDigest: `${ApiPrefix}/digest/weekly`;
}

export const apiRoutes: ApiRouteMap = {
  auth: {
    register: `${API_PREFIX}/auth/register`,
    login: `${API_PREFIX}/auth/login`,
  },
  workspaces: `${API_PREFIX}/workspaces`,
  standups: `${API_PREFIX}/standups`,
  blockerStatus: `${API_PREFIX}/blockers/:id/status`,
  weeklyDigest: `${API_PREFIX}/digest/weekly`,
};

export function blockerStatusPath(id: string): string {
  return `${API_PREFIX}/blockers/${id}/status`;
}

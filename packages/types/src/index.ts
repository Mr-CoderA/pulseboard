/**
 * Shared compile-time and runtime contracts consumed by `@pulseboard/app`
 * and `@pulseboard/backend`. Relational persistence lives in the backend;
 * this package owns the HTTPS Zod boundary.
 */

export type { ApiPrefix, ApiRouteMap } from "./api.js";
export { API_PREFIX, apiRoutes, blockerStatusPath } from "./api.js";
export type { EnvName, RequiredEnvName } from "./env.js";
export { ENV_NAMES, publicEnvNames, requiredEnvNames } from "./env.js";
export type { ProblemDetails } from "./problem.js";
export { PROBLEM_TYPE_BLANK } from "./problem.js";
export type {
  AuthCredentials,
  AuthTokenResponse,
  Blocker,
  BlockerStatus,
  BlockerStatusResponse,
  BlockerStatusUpdate,
  CreateStandupRequest,
  CreateStandupResponse,
  CreateWorkspaceRequest,
  CreateWorkspaceResponse,
  DateRange,
  EntitySchemaMap,
  PayloadSchemaMap,
  RawBlocker,
  Standup,
  StandupListEntry,
  StandupListQuery,
  User,
  WeeklyDigest,
  WeeklyDigestQuery,
  WeeklyDigestResponse,
  Workspace,
  WorkspaceMember,
} from "./schemas.js";
export {
  authCredentialsSchema,
  authTokenResponseSchema,
  BLOCKER_STATUSES,
  blockerDescriptionSchema,
  blockerSchema,
  blockerStatusResponseSchema,
  blockerStatusSchema,
  blockerStatusUpdateSchema,
  createStandupRequestSchema,
  createStandupResponseSchema,
  createWorkspaceRequestSchema,
  createWorkspaceResponseSchema,
  emailSchema,
  entitySchemas,
  isMondayUtc,
  isoDateSchema,
  isoDateTimeSchema,
  markdownSchema,
  nonEmptyNameSchema,
  parseStandupRange,
  passwordHashSchema,
  passwordSchema,
  payloadSchemas,
  problemDetailsSchema,
  rawBlockerSchema,
  rawBlockersSchema,
  standupBodySchema,
  standupListEntrySchema,
  standupListQuerySchema,
  standupListSchema,
  standupRangeSchema,
  standupSchema,
  timezoneSchema,
  tokenSchema,
  userSchema,
  uuidSchema,
  weeklyDigestQuerySchema,
  weeklyDigestResponseSchema,
  weeklyDigestSchema,
  weekStartSchema,
  workspaceListSchema,
  workspaceMemberSchema,
  workspaceSchema,
} from "./schemas.js";

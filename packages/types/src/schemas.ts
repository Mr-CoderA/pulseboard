/**
 * Shared Zod contracts for HTTPS payloads and persisted entities.
 * Wire timestamps are ISO-8601 strings; calendar days are `YYYY-MM-DD`.
 */
import { type ZodType, z } from "zod";
import type { ProblemDetails } from "./problem.js";
import { PROBLEM_TYPE_BLANK } from "./problem.js";

export const BLOCKER_STATUSES: ["OPEN", "RESOLVED", "FLAGGED"] = ["OPEN", "RESOLVED", "FLAGGED"];

export type BlockerStatus = (typeof BLOCKER_STATUSES)[number];

export const uuidSchema: ZodType<string> = z.uuid();
export const emailSchema: ZodType<string> = z.email().max(320);
export const passwordSchema: ZodType<string> = z.string().min(8).max(128);
export const passwordHashSchema: ZodType<string> = z.string().min(20).max(255);
export const isoDateSchema: ZodType<string> = z.iso.date();
export const isoDateTimeSchema: ZodType<string> = z.iso.datetime({ offset: true });
export const tokenSchema: ZodType<string> = z.string().min(16).max(4096);
export const nonEmptyNameSchema: ZodType<string> = z.string().trim().min(1).max(80);
export const standupBodySchema: ZodType<string> = z.string().min(1).max(8000);
export const blockerDescriptionSchema: ZodType<string> = z.string().trim().min(1).max(2000);
export const markdownSchema: ZodType<string> = z.string().min(1).max(200_000);

export const blockerStatusSchema: ZodType<BlockerStatus> = z.enum(BLOCKER_STATUSES);

function isIanaTimeZone(value: string): boolean {
  try {
    Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export const timezoneSchema: ZodType<string> = z
  .string()
  .min(1)
  .max(64)
  .refine(isIanaTimeZone, { message: "timezone must be a valid IANA identifier" });

export const standupRangeSchema: ZodType<string> = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}\/\d{4}-\d{2}-\d{2}$/, {
    message: "range must be YYYY-MM-DD/YYYY-MM-DD",
  });

export interface DateRange {
  readonly from: string;
  readonly to: string;
}

export function parseStandupRange(range: string): DateRange {
  const parsed = standupRangeSchema.parse(range);
  const separator = parsed.indexOf("/");
  const from = isoDateSchema.parse(parsed.slice(0, separator));
  const to = isoDateSchema.parse(parsed.slice(separator + 1));
  if (from > to) {
    throw new Error("range start must be on or before range end");
  }
  return { from, to };
}

export function isMondayUtc(isoDate: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (match === null) {
    return false;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utc = new Date(Date.UTC(year, month - 1, day));
  return utc.getUTCDay() === 1;
}

export const weekStartSchema: ZodType<string> = isoDateSchema.refine(isMondayUtc, {
  message: "weekStart must be a Monday (UTC calendar date)",
});

export interface RawBlocker {
  readonly description: string;
}

export const rawBlockerSchema: ZodType<RawBlocker> = z.strictObject({
  description: blockerDescriptionSchema,
});

export const rawBlockersSchema: ZodType<RawBlocker[]> = z.array(rawBlockerSchema).max(50);

export interface User {
  readonly id: string;
  readonly email: string;
  readonly passwordHash: string;
  readonly createdAt: string;
}

export interface Workspace {
  readonly id: string;
  readonly name: string;
  readonly timezone: string;
  readonly createdBy: string;
  readonly createdAt: string;
}

export interface WorkspaceMember {
  readonly userId: string;
  readonly workspaceId: string;
  readonly joinedAt: string;
}

export interface Standup {
  readonly id: string;
  readonly userId: string;
  readonly workspaceId: string;
  readonly date: string;
  readonly yesterday: string;
  readonly today: string;
  readonly rawBlockers: RawBlocker[];
  readonly submittedAt: string;
}

export interface Blocker {
  readonly id: string;
  readonly standupId: string;
  readonly description: string;
  readonly status: BlockerStatus;
  readonly flaggedAfterDays: number;
  readonly createdAt: string;
}

export interface WeeklyDigest {
  readonly id: string;
  readonly workspaceId: string;
  readonly weekStart: string;
  readonly velocityScore: number;
  readonly unresolvedBlockerCount: number;
  readonly compiledMd: string;
  readonly generatedAt: string;
}

export const userSchema: ZodType<User> = z.strictObject({
  id: uuidSchema,
  email: emailSchema,
  passwordHash: passwordHashSchema,
  createdAt: isoDateTimeSchema,
});

export const workspaceSchema: ZodType<Workspace> = z.strictObject({
  id: uuidSchema,
  name: nonEmptyNameSchema,
  timezone: timezoneSchema,
  createdBy: uuidSchema,
  createdAt: isoDateTimeSchema,
});

export const workspaceMemberSchema: ZodType<WorkspaceMember> = z.strictObject({
  userId: uuidSchema,
  workspaceId: uuidSchema,
  joinedAt: isoDateTimeSchema,
});

export const standupSchema: ZodType<Standup> = z.strictObject({
  id: uuidSchema,
  userId: uuidSchema,
  workspaceId: uuidSchema,
  date: isoDateSchema,
  yesterday: standupBodySchema,
  today: standupBodySchema,
  rawBlockers: rawBlockersSchema,
  submittedAt: isoDateTimeSchema,
});

export const blockerSchema: ZodType<Blocker> = z.strictObject({
  id: uuidSchema,
  standupId: uuidSchema,
  description: blockerDescriptionSchema,
  status: blockerStatusSchema,
  flaggedAfterDays: z.int().min(0).max(32767),
  createdAt: isoDateTimeSchema,
});

export const weeklyDigestSchema: ZodType<WeeklyDigest> = z.strictObject({
  id: uuidSchema,
  workspaceId: uuidSchema,
  weekStart: weekStartSchema,
  velocityScore: z.number().finite().min(0),
  unresolvedBlockerCount: z.int().min(0),
  compiledMd: markdownSchema,
  generatedAt: isoDateTimeSchema,
});

export interface AuthCredentials {
  readonly email: string;
  readonly password: string;
}

export interface AuthTokenResponse {
  readonly token: string;
}

export interface CreateWorkspaceRequest {
  readonly name: string;
  readonly timezone: string;
}

export interface CreateWorkspaceResponse {
  readonly id: string;
  readonly name: string;
  readonly timezone: string;
}

export interface CreateStandupRequest {
  readonly workspaceId: string;
  readonly yesterday: string;
  readonly today: string;
  readonly rawBlockers: RawBlocker[];
}

export interface CreateStandupResponse {
  readonly id: string;
  readonly submittedAt: string;
}

export interface StandupListQuery {
  readonly workspaceId: string;
  readonly range: string;
}

export interface BlockerStatusUpdate {
  readonly status: BlockerStatus;
}

export interface BlockerStatusResponse {
  readonly status: BlockerStatus;
}

export interface WeeklyDigestQuery {
  readonly workspaceId: string;
  readonly weekStart: string;
}

export interface WeeklyDigestResponse {
  readonly velocityScore: number;
  readonly unresolvedBlockerCount: number;
  readonly compiledMd: string;
}

export const authCredentialsSchema: ZodType<AuthCredentials> = z.strictObject({
  email: emailSchema,
  password: passwordSchema,
});

export const authTokenResponseSchema: ZodType<AuthTokenResponse> = z.strictObject({
  token: tokenSchema,
});

export const createWorkspaceRequestSchema: ZodType<CreateWorkspaceRequest> = z.strictObject({
  name: nonEmptyNameSchema,
  timezone: timezoneSchema,
});

export const createWorkspaceResponseSchema: ZodType<CreateWorkspaceResponse> = z.strictObject({
  id: uuidSchema,
  name: nonEmptyNameSchema,
  timezone: timezoneSchema,
});

export const createStandupRequestSchema: ZodType<CreateStandupRequest> = z.strictObject({
  workspaceId: uuidSchema,
  yesterday: standupBodySchema,
  today: standupBodySchema,
  rawBlockers: rawBlockersSchema,
});

export const createStandupResponseSchema: ZodType<CreateStandupResponse> = z.strictObject({
  id: uuidSchema,
  submittedAt: isoDateTimeSchema,
});

export const standupListQuerySchema: ZodType<StandupListQuery> = z.strictObject({
  workspaceId: uuidSchema,
  range: standupRangeSchema,
});

export const blockerStatusUpdateSchema: ZodType<BlockerStatusUpdate> = z.strictObject({
  status: blockerStatusSchema,
});

export const blockerStatusResponseSchema: ZodType<BlockerStatusResponse> = z.strictObject({
  status: blockerStatusSchema,
});

export const weeklyDigestQuerySchema: ZodType<WeeklyDigestQuery> = z.strictObject({
  workspaceId: uuidSchema,
  weekStart: weekStartSchema,
});

export const weeklyDigestResponseSchema: ZodType<WeeklyDigestResponse> = z.strictObject({
  velocityScore: z.number().finite().min(0),
  unresolvedBlockerCount: z.int().min(0),
  compiledMd: markdownSchema,
});

export interface StandupListEntry extends Standup {
  readonly blockers: Blocker[];
}

export const standupListEntrySchema: ZodType<StandupListEntry> = z.intersection(
  standupSchema,
  z.strictObject({
    blockers: z.array(blockerSchema),
  }),
);

export const workspaceListSchema: ZodType<Workspace[]> = z.array(workspaceSchema);
export const standupListSchema: ZodType<StandupListEntry[]> = z.array(standupListEntrySchema);

export const problemDetailsSchema: ZodType<ProblemDetails> = z.object({
  type: z.string().min(1).default(PROBLEM_TYPE_BLANK),
  title: z.string().min(1),
  status: z.int().min(100).max(599),
  detail: z.exactOptional(z.string().min(1)),
  instance: z.exactOptional(z.string().min(1)),
});

export interface EntitySchemaMap {
  readonly user: ZodType<User>;
  readonly workspace: ZodType<Workspace>;
  readonly workspaceMember: ZodType<WorkspaceMember>;
  readonly standup: ZodType<Standup>;
  readonly blocker: ZodType<Blocker>;
  readonly weeklyDigest: ZodType<WeeklyDigest>;
}

export const entitySchemas: EntitySchemaMap = {
  user: userSchema,
  workspace: workspaceSchema,
  workspaceMember: workspaceMemberSchema,
  standup: standupSchema,
  blocker: blockerSchema,
  weeklyDigest: weeklyDigestSchema,
};

export interface PayloadSchemaMap {
  readonly authCredentials: ZodType<AuthCredentials>;
  readonly authTokenResponse: ZodType<AuthTokenResponse>;
  readonly createWorkspaceRequest: ZodType<CreateWorkspaceRequest>;
  readonly createWorkspaceResponse: ZodType<CreateWorkspaceResponse>;
  readonly createStandupRequest: ZodType<CreateStandupRequest>;
  readonly createStandupResponse: ZodType<CreateStandupResponse>;
  readonly standupListQuery: ZodType<StandupListQuery>;
  readonly standupList: ZodType<StandupListEntry[]>;
  readonly workspaceList: ZodType<Workspace[]>;
  readonly blockerStatusUpdate: ZodType<BlockerStatusUpdate>;
  readonly blockerStatusResponse: ZodType<BlockerStatusResponse>;
  readonly weeklyDigestQuery: ZodType<WeeklyDigestQuery>;
  readonly weeklyDigestResponse: ZodType<WeeklyDigestResponse>;
  readonly problemDetails: ZodType<ProblemDetails>;
}

export const payloadSchemas: PayloadSchemaMap = {
  authCredentials: authCredentialsSchema,
  authTokenResponse: authTokenResponseSchema,
  createWorkspaceRequest: createWorkspaceRequestSchema,
  createWorkspaceResponse: createWorkspaceResponseSchema,
  createStandupRequest: createStandupRequestSchema,
  createStandupResponse: createStandupResponseSchema,
  standupListQuery: standupListQuerySchema,
  standupList: standupListSchema,
  workspaceList: workspaceListSchema,
  blockerStatusUpdate: blockerStatusUpdateSchema,
  blockerStatusResponse: blockerStatusResponseSchema,
  weeklyDigestQuery: weeklyDigestQuerySchema,
  weeklyDigestResponse: weeklyDigestResponseSchema,
  problemDetails: problemDetailsSchema,
};

import type {
  Blocker,
  BlockerStatus,
  DateRange,
  RawBlocker,
  Standup,
  User,
  WeeklyDigest,
  Workspace,
} from "@pulseboard/types";

export interface NewUser {
  readonly email: string;
  readonly passwordHash: string;
}

export interface NewWorkspace {
  readonly name: string;
  readonly timezone: string;
  readonly createdBy: string;
}

export interface NewStandup {
  readonly userId: string;
  readonly workspaceId: string;
  readonly date: string;
  readonly yesterday: string;
  readonly today: string;
  readonly rawBlockers: readonly RawBlocker[];
}

export interface NewWeeklyDigest {
  readonly workspaceId: string;
  readonly weekStart: string;
  readonly velocityScore: number;
  readonly unresolvedBlockerCount: number;
  readonly compiledMd: string;
}

export interface BlockerRecord extends Blocker {
  readonly workspaceId: string;
  readonly userId: string;
}

/**
 * Persistence port used by route handlers. Production talks to PostgreSQL;
 * contract tests inject the in-memory adapter. Methods never open a connection
 * on construction — only when invoked.
 */
export interface Store {
  createUser(input: NewUser): Promise<User>;
  findUserById(id: string): Promise<User | undefined>;
  findUserByEmail(email: string): Promise<User | undefined>;

  createWorkspace(input: NewWorkspace): Promise<Workspace>;
  findWorkspaceById(id: string): Promise<Workspace | undefined>;
  listWorkspacesForUser(userId: string): Promise<Workspace[]>;
  isMember(userId: string, workspaceId: string): Promise<boolean>;

  createStandup(input: NewStandup): Promise<Standup>;
  listStandups(workspaceId: string, range: DateRange): Promise<Standup[]>;
  findStandupById(id: string): Promise<Standup | undefined>;

  findBlockerById(id: string): Promise<BlockerRecord | undefined>;
  updateBlockerStatus(id: string, status: BlockerStatus): Promise<Blocker>;
  listBlockersForStandup(standupId: string): Promise<Blocker[]>;

  getWeeklyDigest(workspaceId: string, weekStart: string): Promise<WeeklyDigest | undefined>;
  saveWeeklyDigest(input: NewWeeklyDigest): Promise<WeeklyDigest>;
}

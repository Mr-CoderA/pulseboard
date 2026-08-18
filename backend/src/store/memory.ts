import { randomUUID } from "node:crypto";
import type {
  Blocker,
  BlockerStatus,
  DateRange,
  Standup,
  User,
  WeeklyDigest,
  Workspace,
  WorkspaceMember,
} from "@pulseboard/types";
import type { Clock } from "../clock.js";
import { StoreConflictError, StoreNotFoundError } from "./errors.js";
import type {
  BlockerRecord,
  NewStandup,
  NewUser,
  NewWeeklyDigest,
  NewWorkspace,
  Store,
} from "./port.js";

function iso(clock: Clock): string {
  return clock.now().toISOString();
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function standupKey(userId: string, workspaceId: string, date: string): string {
  return `${userId}\0${workspaceId}\0${date}`;
}

function memberKey(userId: string, workspaceId: string): string {
  return `${userId}\0${workspaceId}`;
}

function digestKey(workspaceId: string, weekStart: string): string {
  return `${workspaceId}\0${weekStart}`;
}

function toBlocker(record: BlockerRecord): Blocker {
  return {
    id: record.id,
    standupId: record.standupId,
    description: record.description,
    status: record.status,
    flaggedAfterDays: record.flaggedAfterDays,
    createdAt: record.createdAt,
  };
}

/**
 * In-memory store adapter. Enforces the same unique keys as the relational
 * schema so HTTP contract tests exercise conflict and membership behavior
 * without PostgreSQL.
 */
export class MemoryStore implements Store {
  private readonly users = new Map<string, User>();
  private readonly usersByEmail = new Map<string, string>();
  private readonly workspaces = new Map<string, Workspace>();
  private readonly members = new Map<string, WorkspaceMember>();
  private readonly standups = new Map<string, Standup>();
  private readonly standupsByNaturalKey = new Map<string, string>();
  private readonly blockers = new Map<string, BlockerRecord>();
  private readonly digests = new Map<string, WeeklyDigest>();

  constructor(private readonly clock: Clock) {}

  async createUser(input: NewUser): Promise<User> {
    const email = normalizeEmail(input.email);
    if (this.usersByEmail.has(email)) {
      throw new StoreConflictError("email already registered");
    }
    const user: User = {
      id: randomUUID(),
      email,
      passwordHash: input.passwordHash,
      createdAt: iso(this.clock),
    };
    this.users.set(user.id, user);
    this.usersByEmail.set(email, user.id);
    return user;
  }

  async findUserById(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async findUserByEmail(email: string): Promise<User | undefined> {
    const id = this.usersByEmail.get(normalizeEmail(email));
    if (id === undefined) {
      return undefined;
    }
    return this.users.get(id);
  }

  async createWorkspace(input: NewWorkspace): Promise<Workspace> {
    const creator = this.users.get(input.createdBy);
    if (creator === undefined) {
      throw new StoreNotFoundError("creator does not exist");
    }
    const workspace: Workspace = {
      id: randomUUID(),
      name: input.name,
      timezone: input.timezone,
      createdBy: input.createdBy,
      createdAt: iso(this.clock),
    };
    this.workspaces.set(workspace.id, workspace);
    const membership: WorkspaceMember = {
      userId: input.createdBy,
      workspaceId: workspace.id,
      joinedAt: workspace.createdAt,
    };
    this.members.set(memberKey(membership.userId, membership.workspaceId), membership);
    return workspace;
  }

  async findWorkspaceById(id: string): Promise<Workspace | undefined> {
    return this.workspaces.get(id);
  }

  async listWorkspacesForUser(userId: string): Promise<Workspace[]> {
    const result: Workspace[] = [];
    for (const membership of this.members.values()) {
      if (membership.userId !== userId) {
        continue;
      }
      const workspace = this.workspaces.get(membership.workspaceId);
      if (workspace !== undefined) {
        result.push(workspace);
      }
    }
    result.sort((left, right) => {
      if (left.createdAt === right.createdAt) {
        return left.name.localeCompare(right.name);
      }
      return left.createdAt < right.createdAt ? -1 : 1;
    });
    return result;
  }

  async isMember(userId: string, workspaceId: string): Promise<boolean> {
    return this.members.has(memberKey(userId, workspaceId));
  }

  async createStandup(input: NewStandup): Promise<Standup> {
    const natural = standupKey(input.userId, input.workspaceId, input.date);
    if (this.standupsByNaturalKey.has(natural)) {
      throw new StoreConflictError("standup already submitted for this date");
    }
    const submittedAt = iso(this.clock);
    const standup: Standup = {
      id: randomUUID(),
      userId: input.userId,
      workspaceId: input.workspaceId,
      date: input.date,
      yesterday: input.yesterday,
      today: input.today,
      rawBlockers: input.rawBlockers.map((blocker) => ({ description: blocker.description })),
      submittedAt,
    };
    this.standups.set(standup.id, standup);
    this.standupsByNaturalKey.set(natural, standup.id);
    for (const raw of standup.rawBlockers) {
      const blocker: BlockerRecord = {
        id: randomUUID(),
        standupId: standup.id,
        description: raw.description,
        status: "OPEN",
        flaggedAfterDays: 0,
        createdAt: submittedAt,
        workspaceId: input.workspaceId,
        userId: input.userId,
      };
      this.blockers.set(blocker.id, blocker);
    }
    return standup;
  }

  async listStandups(workspaceId: string, range: DateRange): Promise<Standup[]> {
    const result: Standup[] = [];
    for (const standup of this.standups.values()) {
      if (standup.workspaceId !== workspaceId) {
        continue;
      }
      if (standup.date < range.from || standup.date > range.to) {
        continue;
      }
      result.push(standup);
    }
    result.sort((left, right) => {
      if (left.date === right.date) {
        return left.submittedAt < right.submittedAt ? -1 : 1;
      }
      return left.date < right.date ? -1 : 1;
    });
    return result;
  }

  async findStandupById(id: string): Promise<Standup | undefined> {
    return this.standups.get(id);
  }

  async findBlockerById(id: string): Promise<BlockerRecord | undefined> {
    return this.blockers.get(id);
  }

  async updateBlockerStatus(id: string, status: BlockerStatus): Promise<Blocker> {
    const existing = this.blockers.get(id);
    if (existing === undefined) {
      throw new StoreNotFoundError("blocker not found");
    }
    const updated: BlockerRecord = { ...existing, status };
    this.blockers.set(id, updated);
    return toBlocker(updated);
  }

  async listBlockersForStandup(standupId: string): Promise<Blocker[]> {
    const result: Blocker[] = [];
    for (const record of this.blockers.values()) {
      if (record.standupId !== standupId) {
        continue;
      }
      result.push(toBlocker(record));
    }
    result.sort((left, right) => (left.createdAt < right.createdAt ? -1 : 1));
    return result;
  }

  async getWeeklyDigest(workspaceId: string, weekStart: string): Promise<WeeklyDigest | undefined> {
    return this.digests.get(digestKey(workspaceId, weekStart));
  }

  async saveWeeklyDigest(input: NewWeeklyDigest): Promise<WeeklyDigest> {
    const key = digestKey(input.workspaceId, input.weekStart);
    const existing = this.digests.get(key);
    const digest: WeeklyDigest = {
      id: existing?.id ?? randomUUID(),
      workspaceId: input.workspaceId,
      weekStart: input.weekStart,
      velocityScore: input.velocityScore,
      unresolvedBlockerCount: input.unresolvedBlockerCount,
      compiledMd: input.compiledMd,
      generatedAt: iso(this.clock),
    };
    this.digests.set(key, digest);
    return digest;
  }
}

export function createMemoryStore(clock: Clock): MemoryStore {
  return new MemoryStore(clock);
}

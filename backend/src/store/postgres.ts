import type {
  Blocker,
  BlockerStatus,
  DateRange,
  Standup,
  User,
  WeeklyDigest,
  Workspace,
} from "@pulseboard/types";
import { and, eq, gte, lte } from "drizzle-orm";
import type { Clock } from "../clock.js";
import type { PulseboardDatabase } from "../db/client.js";
import {
  type BlockerRow,
  blockers,
  type StandupRow,
  standups,
  type UserRow,
  users,
  type WeeklyDigestRow,
  type WorkspaceRow,
  weeklyDigests,
  workspaceMembers,
  workspaces,
} from "../db/schema.js";
import { StoreConflictError, StoreNotFoundError } from "./errors.js";
import type {
  BlockerRecord,
  NewStandup,
  NewUser,
  NewWeeklyDigest,
  NewWorkspace,
  Store,
} from "./port.js";

function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return false;
  }
  return error.code === "23505";
}

function rethrow(error: unknown): never {
  if (error instanceof StoreConflictError || error instanceof StoreNotFoundError) {
    throw error;
  }
  if (isUniqueViolation(error)) {
    throw new StoreConflictError("unique constraint violated");
  }
  throw error;
}

function wireUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.passwordHash,
    createdAt: row.createdAt.toISOString(),
  };
}

function wireWorkspace(row: WorkspaceRow): Workspace {
  return {
    id: row.id,
    name: row.name,
    timezone: row.timezone,
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(),
  };
}

function wireStandup(row: StandupRow): Standup {
  return {
    id: row.id,
    userId: row.userId,
    workspaceId: row.workspaceId,
    date: row.date,
    yesterday: row.yesterday,
    today: row.today,
    rawBlockers: row.rawBlockers,
    submittedAt: row.submittedAt.toISOString(),
  };
}

function wireBlocker(row: BlockerRow): Blocker {
  return {
    id: row.id,
    standupId: row.standupId,
    description: row.description,
    status: row.status,
    flaggedAfterDays: row.flaggedAfterDays,
    createdAt: row.createdAt.toISOString(),
  };
}

function wireDigest(row: WeeklyDigestRow): WeeklyDigest {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    weekStart: row.weekStart,
    velocityScore: row.velocityScore,
    unresolvedBlockerCount: row.unresolvedBlockerCount,
    compiledMd: row.compiledMd,
    generatedAt: row.generatedAt.toISOString(),
  };
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Drizzle-backed store. Construction does not open PostgreSQL; queries run
 * only when a handler invokes a method. Build and unit tests never construct
 * this adapter.
 */
export function createPostgresStore(db: PulseboardDatabase, clock: Clock): Store {
  return {
    async createUser(input: NewUser): Promise<User> {
      try {
        const [row] = await db
          .insert(users)
          .values({
            email: normalizeEmail(input.email),
            passwordHash: input.passwordHash,
            createdAt: clock.now(),
          })
          .returning();
        if (row === undefined) {
          throw new Error("insert user returned no row");
        }
        return wireUser(row);
      } catch (error) {
        rethrow(error);
      }
    },

    async findUserById(id: string): Promise<User | undefined> {
      const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1);
      return row === undefined ? undefined : wireUser(row);
    },

    async findUserByEmail(email: string): Promise<User | undefined> {
      const [row] = await db
        .select()
        .from(users)
        .where(eq(users.email, normalizeEmail(email)))
        .limit(1);
      return row === undefined ? undefined : wireUser(row);
    },

    async createWorkspace(input: NewWorkspace): Promise<Workspace> {
      const now = clock.now();
      try {
        return await db.transaction(async (tx) => {
          const [row] = await tx
            .insert(workspaces)
            .values({
              name: input.name,
              timezone: input.timezone,
              createdBy: input.createdBy,
              createdAt: now,
            })
            .returning();
          if (row === undefined) {
            throw new Error("insert workspace returned no row");
          }
          await tx.insert(workspaceMembers).values({
            userId: input.createdBy,
            workspaceId: row.id,
            joinedAt: now,
          });
          return wireWorkspace(row);
        });
      } catch (error) {
        rethrow(error);
      }
    },

    async findWorkspaceById(id: string): Promise<Workspace | undefined> {
      const [row] = await db.select().from(workspaces).where(eq(workspaces.id, id)).limit(1);
      return row === undefined ? undefined : wireWorkspace(row);
    },

    async listWorkspacesForUser(userId: string): Promise<Workspace[]> {
      const rows = await db
        .select({ workspace: workspaces })
        .from(workspaceMembers)
        .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
        .where(eq(workspaceMembers.userId, userId));
      const result = rows.map((entry) => wireWorkspace(entry.workspace));
      result.sort((left, right) => {
        if (left.createdAt === right.createdAt) {
          return left.name.localeCompare(right.name);
        }
        return left.createdAt < right.createdAt ? -1 : 1;
      });
      return result;
    },

    async isMember(userId: string, workspaceId: string): Promise<boolean> {
      const [row] = await db
        .select({ userId: workspaceMembers.userId })
        .from(workspaceMembers)
        .where(
          and(eq(workspaceMembers.userId, userId), eq(workspaceMembers.workspaceId, workspaceId)),
        )
        .limit(1);
      return row !== undefined;
    },

    async createStandup(input: NewStandup): Promise<Standup> {
      const submittedAt = clock.now();
      try {
        return await db.transaction(async (tx) => {
          const [row] = await tx
            .insert(standups)
            .values({
              userId: input.userId,
              workspaceId: input.workspaceId,
              date: input.date,
              yesterday: input.yesterday,
              today: input.today,
              rawBlockers: [...input.rawBlockers],
              submittedAt,
            })
            .returning();
          if (row === undefined) {
            throw new Error("insert standup returned no row");
          }
          if (input.rawBlockers.length > 0) {
            await tx.insert(blockers).values(
              input.rawBlockers.map((raw) => ({
                standupId: row.id,
                description: raw.description,
                status: "OPEN" as const,
                flaggedAfterDays: 0,
                createdAt: submittedAt,
              })),
            );
          }
          return wireStandup(row);
        });
      } catch (error) {
        rethrow(error);
      }
    },

    async listStandups(workspaceId: string, range: DateRange): Promise<Standup[]> {
      const rows = await db
        .select()
        .from(standups)
        .where(
          and(
            eq(standups.workspaceId, workspaceId),
            gte(standups.date, range.from),
            lte(standups.date, range.to),
          ),
        );
      const result = rows.map(wireStandup);
      result.sort((left, right) => {
        if (left.date === right.date) {
          return left.submittedAt < right.submittedAt ? -1 : 1;
        }
        return left.date < right.date ? -1 : 1;
      });
      return result;
    },

    async findStandupById(id: string): Promise<Standup | undefined> {
      const [row] = await db.select().from(standups).where(eq(standups.id, id)).limit(1);
      return row === undefined ? undefined : wireStandup(row);
    },

    async findBlockerById(id: string): Promise<BlockerRecord | undefined> {
      const [row] = await db
        .select({
          blocker: blockers,
          workspaceId: standups.workspaceId,
          userId: standups.userId,
        })
        .from(blockers)
        .innerJoin(standups, eq(blockers.standupId, standups.id))
        .where(eq(blockers.id, id))
        .limit(1);
      if (row === undefined) {
        return undefined;
      }
      return {
        ...wireBlocker(row.blocker),
        workspaceId: row.workspaceId,
        userId: row.userId,
      };
    },

    async updateBlockerStatus(id: string, status: BlockerStatus): Promise<Blocker> {
      try {
        const [row] = await db
          .update(blockers)
          .set({ status })
          .where(eq(blockers.id, id))
          .returning();
        if (row === undefined) {
          throw new StoreNotFoundError("blocker not found");
        }
        return wireBlocker(row);
      } catch (error) {
        rethrow(error);
      }
    },

    async listBlockersForStandup(standupId: string): Promise<Blocker[]> {
      const rows = await db.select().from(blockers).where(eq(blockers.standupId, standupId));
      const result = rows.map(wireBlocker);
      result.sort((left, right) => (left.createdAt < right.createdAt ? -1 : 1));
      return result;
    },

    async getWeeklyDigest(
      workspaceId: string,
      weekStart: string,
    ): Promise<WeeklyDigest | undefined> {
      const [row] = await db
        .select()
        .from(weeklyDigests)
        .where(
          and(eq(weeklyDigests.workspaceId, workspaceId), eq(weeklyDigests.weekStart, weekStart)),
        )
        .limit(1);
      return row === undefined ? undefined : wireDigest(row);
    },

    async saveWeeklyDigest(input: NewWeeklyDigest): Promise<WeeklyDigest> {
      const generatedAt = clock.now();
      try {
        const [row] = await db
          .insert(weeklyDigests)
          .values({
            workspaceId: input.workspaceId,
            weekStart: input.weekStart,
            velocityScore: input.velocityScore,
            unresolvedBlockerCount: input.unresolvedBlockerCount,
            compiledMd: input.compiledMd,
            generatedAt,
          })
          .onConflictDoUpdate({
            target: [weeklyDigests.workspaceId, weeklyDigests.weekStart],
            set: {
              velocityScore: input.velocityScore,
              unresolvedBlockerCount: input.unresolvedBlockerCount,
              compiledMd: input.compiledMd,
              generatedAt,
            },
          })
          .returning();
        if (row === undefined) {
          throw new Error("upsert weekly digest returned no row");
        }
        return wireDigest(row);
      } catch (error) {
        rethrow(error);
      }
    },
  };
}

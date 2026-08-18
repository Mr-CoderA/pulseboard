import { BLOCKER_STATUSES, type RawBlocker } from "@pulseboard/types";
import { relations, sql } from "drizzle-orm";
import {
  check,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const blockerStatusEnum = pgEnum("blocker_status", BLOCKER_STATUSES);

const timestamptz = (name: string) =>
  timestamp(name, { withTimezone: true, mode: "date", precision: 3 });

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull().unique("users_email_uidx"),
    passwordHash: text("password_hash").notNull(),
    createdAt: timestamptz("created_at").notNull().defaultNow(),
  },
  (table) => [
    check("users_email_present", sql`char_length(trim(${table.email})) > 3`),
    check("users_password_hash_present", sql`char_length(${table.passwordHash}) >= 20`),
  ],
);

export const workspaces = pgTable(
  "workspaces",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    timezone: text("timezone").notNull(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict", onUpdate: "cascade" }),
    createdAt: timestamptz("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("workspaces_created_by_idx").on(table.createdBy),
    check("workspaces_name_present", sql`char_length(trim(${table.name})) > 0`),
    check("workspaces_timezone_present", sql`char_length(trim(${table.timezone})) > 0`),
  ],
);

export const workspaceMembers = pgTable(
  "workspace_members",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" }),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade", onUpdate: "cascade" }),
    joinedAt: timestamptz("joined_at").notNull().defaultNow(),
  },
  (table) => [
    primaryKey({
      name: "workspace_members_pkey",
      columns: [table.userId, table.workspaceId],
    }),
    index("workspace_members_workspace_idx").on(table.workspaceId),
  ],
);

export const standups = pgTable(
  "standups",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" }),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade", onUpdate: "cascade" }),
    date: date("date", { mode: "string" }).notNull(),
    yesterday: text("yesterday").notNull(),
    today: text("today").notNull(),
    rawBlockers: jsonb("raw_blockers").$type<RawBlocker[]>().notNull(),
    submittedAt: timestamptz("submitted_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("standups_user_workspace_date_uidx").on(
      table.userId,
      table.workspaceId,
      table.date,
    ),
    index("standups_workspace_date_idx").on(table.workspaceId, table.date),
    check("standups_yesterday_present", sql`char_length(${table.yesterday}) > 0`),
    check("standups_today_present", sql`char_length(${table.today}) > 0`),
    check("standups_raw_blockers_array", sql`jsonb_typeof(${table.rawBlockers}) = 'array'`),
  ],
);

export const blockers = pgTable(
  "blockers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    standupId: uuid("standup_id")
      .notNull()
      .references(() => standups.id, { onDelete: "cascade", onUpdate: "cascade" }),
    description: text("description").notNull(),
    status: blockerStatusEnum("status").notNull().default("OPEN"),
    flaggedAfterDays: smallint("flagged_after_days").notNull().default(0),
    createdAt: timestamptz("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("blockers_standup_idx").on(table.standupId),
    index("blockers_status_idx").on(table.status),
    check("blockers_description_present", sql`char_length(trim(${table.description})) > 0`),
    check("blockers_flagged_after_days_nonnegative", sql`${table.flaggedAfterDays} >= 0`),
  ],
);

export const weeklyDigests = pgTable(
  "weekly_digests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade", onUpdate: "cascade" }),
    weekStart: date("week_start", { mode: "string" }).notNull(),
    velocityScore: real("velocity_score").notNull(),
    unresolvedBlockerCount: integer("unresolved_blocker_count").notNull(),
    compiledMd: text("compiled_md").notNull(),
    generatedAt: timestamptz("generated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("weekly_digests_workspace_week_uidx").on(table.workspaceId, table.weekStart),
    check("weekly_digests_velocity_nonnegative", sql`${table.velocityScore} >= 0`),
    check("weekly_digests_unresolved_nonnegative", sql`${table.unresolvedBlockerCount} >= 0`),
    check("weekly_digests_compiled_present", sql`char_length(${table.compiledMd}) > 0`),
  ],
);

export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(workspaceMembers),
  createdWorkspaces: many(workspaces),
  standups: many(standups),
}));

export const workspacesRelations = relations(workspaces, ({ one, many }) => ({
  creator: one(users, {
    fields: [workspaces.createdBy],
    references: [users.id],
  }),
  members: many(workspaceMembers),
  standups: many(standups),
  weeklyDigests: many(weeklyDigests),
}));

export const workspaceMembersRelations = relations(workspaceMembers, ({ one }) => ({
  user: one(users, {
    fields: [workspaceMembers.userId],
    references: [users.id],
  }),
  workspace: one(workspaces, {
    fields: [workspaceMembers.workspaceId],
    references: [workspaces.id],
  }),
}));

export const standupsRelations = relations(standups, ({ one, many }) => ({
  user: one(users, {
    fields: [standups.userId],
    references: [users.id],
  }),
  workspace: one(workspaces, {
    fields: [standups.workspaceId],
    references: [workspaces.id],
  }),
  blockers: many(blockers),
}));

export const blockersRelations = relations(blockers, ({ one }) => ({
  standup: one(standups, {
    fields: [blockers.standupId],
    references: [standups.id],
  }),
}));

export const weeklyDigestsRelations = relations(weeklyDigests, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [weeklyDigests.workspaceId],
    references: [workspaces.id],
  }),
}));

export const relationalTables = [
  users,
  workspaces,
  workspaceMembers,
  standups,
  blockers,
  weeklyDigests,
] as const;

export type UserRow = typeof users.$inferSelect;
export type WorkspaceRow = typeof workspaces.$inferSelect;
export type WorkspaceMemberRow = typeof workspaceMembers.$inferSelect;
export type StandupRow = typeof standups.$inferSelect;
export type BlockerRow = typeof blockers.$inferSelect;
export type WeeklyDigestRow = typeof weeklyDigests.$inferSelect;

export type NewUserRow = typeof users.$inferInsert;
export type NewWorkspaceRow = typeof workspaces.$inferInsert;
export type NewWorkspaceMemberRow = typeof workspaceMembers.$inferInsert;
export type NewStandupRow = typeof standups.$inferInsert;
export type NewBlockerRow = typeof blockers.$inferInsert;
export type NewWeeklyDigestRow = typeof weeklyDigests.$inferInsert;

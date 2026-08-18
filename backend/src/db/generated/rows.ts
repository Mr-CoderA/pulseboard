/**
 * AUTO-GENERATED persistence row shapes from src/db/schema.ts.
 * Wire types (ISO strings) live in @pulseboard/types.
 */
import type { BlockerStatus, RawBlocker } from "@pulseboard/types";

export interface GeneratedUserRow {
  readonly id: string;
  readonly email: string;
  readonly passwordHash: string;
  readonly createdAt: Date;
}

export interface GeneratedWorkspaceRow {
  readonly id: string;
  readonly name: string;
  readonly timezone: string;
  readonly createdBy: string;
  readonly createdAt: Date;
}

export interface GeneratedWorkspaceMemberRow {
  readonly userId: string;
  readonly workspaceId: string;
  readonly joinedAt: Date;
}

export interface GeneratedStandupRow {
  readonly id: string;
  readonly userId: string;
  readonly workspaceId: string;
  readonly date: string;
  readonly yesterday: string;
  readonly today: string;
  readonly rawBlockers: RawBlocker[];
  readonly submittedAt: Date;
}

export interface GeneratedBlockerRow {
  readonly id: string;
  readonly standupId: string;
  readonly description: string;
  readonly status: BlockerStatus;
  readonly flaggedAfterDays: number;
  readonly createdAt: Date;
}

export interface GeneratedWeeklyDigestRow {
  readonly id: string;
  readonly workspaceId: string;
  readonly weekStart: string;
  readonly velocityScore: number;
  readonly unresolvedBlockerCount: number;
  readonly compiledMd: string;
  readonly generatedAt: Date;
}

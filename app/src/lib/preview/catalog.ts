import type { Blocker, Standup, WeeklyDigest, Workspace } from "@pulseboard/types";
import type { PreviewWorkspaceSlug } from "../routes/manifest.js";

/**
 * Deterministic preview fixtures used to prerender workspace routes.
 * These are editorial stand-ins, not live API responses.
 */
export const PREVIEW_NOW = new Date("2026-08-18T18:30:00.000Z");

export const PREVIEW_USER_ID = "a11ce000-0000-4000-8000-000000000001";

export interface PreviewWorkspace extends Workspace {
  readonly slug: PreviewWorkspaceSlug;
}

export const ATLAS_WORKSPACE: PreviewWorkspace = {
  slug: "atlas",
  id: "8f3c2a10-6b21-4d0e-9c4a-1b7e5d2f90aa",
  name: "Atlas",
  timezone: "America/New_York",
  createdBy: PREVIEW_USER_ID,
  createdAt: "2026-04-06T14:00:00.000Z",
};

export const PREVIEW_CATALOG: Record<PreviewWorkspaceSlug, PreviewWorkspace> = {
  atlas: ATLAS_WORKSPACE,
};

export function previewWorkspace(slug: string): PreviewWorkspace | undefined {
  if (slug === ATLAS_WORKSPACE.slug) {
    return ATLAS_WORKSPACE;
  }
  return undefined;
}

export const PREVIEW_STANDUPS: readonly Standup[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    userId: PREVIEW_USER_ID,
    workspaceId: ATLAS_WORKSPACE.id,
    date: "2026-08-18",
    yesterday: "Shipped the RFC 7807 envelope on auth failures and aligned cookie flags.",
    today: "Wire the static app client to PUBLIC_API_ORIGIN and lock prerender entries.",
    rawBlockers: [{ description: "Fly.io certificate renewal queued behind DNS cutover." }],
    submittedAt: "2026-08-18T13:07:00.000Z",
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    userId: PREVIEW_USER_ID,
    workspaceId: ATLAS_WORKSPACE.id,
    date: "2026-08-17",
    yesterday: "Closed the standup range parser and rejected inverted date windows.",
    today: "Generate Drizzle types and confirm weekStart is a Monday.",
    rawBlockers: [],
    submittedAt: "2026-08-17T13:02:00.000Z",
  },
  {
    id: "33333333-3333-4333-8333-333333333333",
    userId: PREVIEW_USER_ID,
    workspaceId: ATLAS_WORKSPACE.id,
    date: "2026-08-14",
    yesterday: "Drafted the workspace-local calendar helper with date-fns-tz.",
    today: "Prove standup `date` is the workspace day, not the UTC day.",
    rawBlockers: [{ description: "QStash endpoint still unnamed in the staging secret set." }],
    submittedAt: "2026-08-14T13:11:00.000Z",
  },
  {
    id: "44444444-4444-4444-8444-444444444444",
    userId: PREVIEW_USER_ID,
    workspaceId: ATLAS_WORKSPACE.id,
    date: "2026-08-13",
    yesterday: "Landed password hashing tests against the memory store.",
    today: "Write the register/login contract cases for 201/200 { token }.",
    rawBlockers: [],
    submittedAt: "2026-08-13T13:04:00.000Z",
  },
  {
    id: "55555555-5555-4555-8555-555555555555",
    userId: PREVIEW_USER_ID,
    workspaceId: ATLAS_WORKSPACE.id,
    date: "2026-08-12",
    yesterday: "Named the CSS variable pipeline and locked the slate scale.",
    today: "Set Inter / IBM Plex Mono pairings and the 8px spacing ladder.",
    rawBlockers: [{ description: "Edge cache purge still manual after each Pages deploy." }],
    submittedAt: "2026-08-12T13:19:00.000Z",
  },
];

export const PREVIEW_BLOCKERS: readonly Blocker[] = [
  {
    id: "b1000000-0000-4000-8000-000000000001",
    standupId: "11111111-1111-4111-8111-111111111111",
    description: "Fly.io certificate renewal queued behind DNS cutover.",
    status: "OPEN",
    flaggedAfterDays: 2,
    createdAt: "2026-08-18T13:07:00.000Z",
  },
  {
    id: "b2000000-0000-4000-8000-000000000002",
    standupId: "33333333-3333-4333-8333-333333333333",
    description: "QStash endpoint still unnamed in the staging secret set.",
    status: "FLAGGED",
    flaggedAfterDays: 3,
    createdAt: "2026-08-14T13:11:00.000Z",
  },
  {
    id: "b3000000-0000-4000-8000-000000000003",
    standupId: "55555555-5555-4555-8555-555555555555",
    description: "Edge cache purge still manual after each Pages deploy.",
    status: "RESOLVED",
    flaggedAfterDays: 2,
    createdAt: "2026-08-12T13:19:00.000Z",
  },
];

export const PREVIEW_DIGEST: WeeklyDigest = {
  id: "d1000000-0000-4000-8000-000000000001",
  workspaceId: ATLAS_WORKSPACE.id,
  weekStart: "2026-08-17",
  velocityScore: 0.82,
  unresolvedBlockerCount: 2,
  compiledMd:
    "## Atlas · week of 17 Aug 2026\n\nVelocity 0.82. Two blockers remain open: DNS cutover ahead of the Fly.io certificate, and the staging scheduler secret. Three of five standups filed inside the 08:00–11:00 America/New_York window.",
  generatedAt: "2026-08-18T16:00:00.000Z",
};

export function standupsInRange(
  from: string,
  to: string,
  standups: readonly Standup[] = PREVIEW_STANDUPS,
): Standup[] {
  return standups.filter((entry) => entry.date >= from && entry.date <= to);
}

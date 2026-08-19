import type { CreateWorkspaceResponse } from "@pulseboard/types";
import { type ApiClient, ApiProblemError, MissingApiOriginError } from "../api/client.js";
import { ATLAS_WORKSPACE } from "../preview/catalog.js";

/** Editorial Atlas fixture id. Never a default query param for live calls. */
export const PREVIEW_WORKSPACE_ID = ATLAS_WORKSPACE.id;

export type MemberSession =
  | { readonly kind: "anonymous" }
  | { readonly kind: "member"; readonly workspace: CreateWorkspaceResponse };

let inflight: Promise<MemberSession> | undefined;

export function resetMemberWorkspaceResolver(): void {
  inflight = undefined;
}

/**
 * Resolves the signed-in member's workspace for Atlas floors.
 * Concurrent callers share one GET (and at most one Atlas POST).
 * Anonymous results are not sticky so a later cookie session can retry.
 */
export function resolveMemberWorkspace(client: ApiClient): Promise<MemberSession> {
  if (inflight === undefined) {
    inflight = probe(client).then((session) => {
      if (session.kind === "anonymous") {
        inflight = undefined;
      }
      return session;
    });
  }
  return inflight;
}

function isNoSession(error: unknown): boolean {
  return (
    error instanceof ApiProblemError &&
    (error.problem.status === 401 || error.problem.status === 403)
  );
}

function toMemberWorkspace(row: {
  id: string;
  name: string;
  timezone: string;
}): CreateWorkspaceResponse {
  return { id: row.id, name: row.name, timezone: row.timezone };
}

function selectWorkspace(
  rows: readonly { id: string; name: string; timezone: string }[],
): CreateWorkspaceResponse | undefined {
  const named = rows.find((row) => row.name === ATLAS_WORKSPACE.name);
  const chosen = named ?? rows[0];
  return chosen === undefined ? undefined : toMemberWorkspace(chosen);
}

async function probe(client: ApiClient): Promise<MemberSession> {
  try {
    const listed = await client.listWorkspaces();
    if (listed.length === 0) {
      const created = await client.createWorkspace({
        name: ATLAS_WORKSPACE.name,
        timezone: ATLAS_WORKSPACE.timezone,
      });
      return { kind: "member", workspace: toMemberWorkspace(created) };
    }
    const chosen = selectWorkspace(listed);
    if (chosen === undefined) {
      return { kind: "anonymous" };
    }
    return { kind: "member", workspace: chosen };
  } catch (error) {
    if (error instanceof MissingApiOriginError || isNoSession(error)) {
      return { kind: "anonymous" };
    }
    return { kind: "anonymous" };
  }
}

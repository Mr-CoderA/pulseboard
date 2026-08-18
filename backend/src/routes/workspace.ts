import {
  apiRoutes,
  createWorkspaceRequestSchema,
  createWorkspaceResponseSchema,
  workspaceListSchema,
} from "@pulseboard/types";
import type { AppDependencies } from "../http/app.js";
import { forbidden, notFound } from "../http/errors.js";
import { parsePayload } from "../http/parse.js";
import { jsonResult } from "../http/response.js";
import type { RouteContext, Router } from "../http/router.js";
import { requireActor } from "./auth.js";

export async function requireWorkspaceMember(
  deps: AppDependencies,
  ctx: RouteContext,
  workspaceId: string,
) {
  const actor = requireActor(ctx);
  const workspace = await deps.store.findWorkspaceById(workspaceId);
  if (workspace === undefined) {
    throw notFound("workspace not found", ctx.instance);
  }
  const member = await deps.store.isMember(actor.actor.userId, workspaceId);
  if (!member) {
    throw forbidden("not a workspace member", ctx.instance);
  }
  return { actor: actor.actor, workspace };
}

export function registerWorkspaceRoutes(router: Router, deps: AppDependencies): void {
  router.add({
    method: "GET",
    path: apiRoutes.workspaces,
    public: false,
    handler: async (ctx) => {
      const { actor } = requireActor(ctx);
      const workspaces = await deps.store.listWorkspacesForUser(actor.userId);
      return jsonResult(200, workspaceListSchema.parse(workspaces));
    },
  });

  router.add({
    method: "POST",
    path: apiRoutes.workspaces,
    public: false,
    handler: async (ctx) => {
      const { actor } = requireActor(ctx);
      const payload = parsePayload(createWorkspaceRequestSchema, ctx.body, ctx.instance);
      const workspace = await deps.store.createWorkspace({
        name: payload.name,
        timezone: payload.timezone,
        createdBy: actor.userId,
      });
      return jsonResult(
        201,
        createWorkspaceResponseSchema.parse({
          id: workspace.id,
          name: workspace.name,
          timezone: workspace.timezone,
        }),
      );
    },
  });
}

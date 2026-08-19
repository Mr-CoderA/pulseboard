import {
  apiRoutes,
  blockerStatusPath,
  blockerStatusResponseSchema,
  blockerStatusUpdateSchema,
  createStandupRequestSchema,
  createStandupResponseSchema,
  parseStandupRange,
  standupListQuerySchema,
  standupListSchema,
  uuidSchema,
  weeklyDigestQuerySchema,
  weeklyDigestResponseSchema,
} from "@pulseboard/types";
import type { AppDependencies } from "../http/app.js";
import { badRequest, conflict, forbidden, notFound } from "../http/errors.js";
import { parsePayload } from "../http/parse.js";
import { jsonResult } from "../http/response.js";
import type { Router } from "../http/router.js";
import { StoreConflictError } from "../store/errors.js";
import { calendarDateInZone } from "../time/workspace-date.js";
import { requireActor } from "./auth.js";
import { requireWorkspaceMember } from "./workspace.js";

const BLOCKER_STATUS_PATH = blockerStatusPath(":id");

export function registerStandupRoutes(router: Router, deps: AppDependencies): void {
  router.add({
    method: "POST",
    path: apiRoutes.standups,
    public: false,
    handler: async (ctx) => {
      const payload = parsePayload(createStandupRequestSchema, ctx.body, ctx.instance);
      const { actor, workspace } = await requireWorkspaceMember(deps, ctx, payload.workspaceId);
      const date = calendarDateInZone(deps.clock.now(), workspace.timezone);
      try {
        const standup = await deps.store.createStandup({
          userId: actor.userId,
          workspaceId: workspace.id,
          date,
          yesterday: payload.yesterday,
          today: payload.today,
          rawBlockers: payload.rawBlockers,
        });
        return jsonResult(
          201,
          createStandupResponseSchema.parse({
            id: standup.id,
            submittedAt: standup.submittedAt,
          }),
        );
      } catch (error) {
        if (error instanceof StoreConflictError) {
          throw conflict("standup already submitted for this workspace date", ctx.instance);
        }
        throw error;
      }
    },
  });

  router.add({
    method: "GET",
    path: apiRoutes.standups,
    public: false,
    handler: async (ctx) => {
      const query = parsePayload(standupListQuerySchema, ctx.query, ctx.instance);
      await requireWorkspaceMember(deps, ctx, query.workspaceId);
      let range: ReturnType<typeof parseStandupRange>;
      try {
        range = parseStandupRange(query.range);
      } catch {
        throw badRequest("range start must be on or before range end", ctx.instance);
      }
      const standups = await deps.store.listStandups(query.workspaceId, range);
      const entries = await Promise.all(
        standups.map(async (standup) => ({
          ...standup,
          blockers: await deps.store.listBlockersForStandup(standup.id),
        })),
      );
      return jsonResult(200, standupListSchema.parse(entries));
    },
  });

  router.add({
    method: "PATCH",
    path: BLOCKER_STATUS_PATH,
    public: false,
    handler: async (ctx) => {
      const { actor } = requireActor(ctx);
      const blockerId = parsePayload(uuidSchema, ctx.params.id, ctx.instance);
      const payload = parsePayload(blockerStatusUpdateSchema, ctx.body, ctx.instance);
      const record = await deps.store.findBlockerById(blockerId);
      if (record === undefined) {
        throw notFound("blocker not found", ctx.instance);
      }
      const member = await deps.store.isMember(actor.userId, record.workspaceId);
      if (!member) {
        throw forbidden("not a workspace member", ctx.instance);
      }
      const updated = await deps.store.updateBlockerStatus(blockerId, payload.status);
      return jsonResult(200, blockerStatusResponseSchema.parse({ status: updated.status }));
    },
  });

  router.add({
    method: "GET",
    path: apiRoutes.weeklyDigest,
    public: false,
    handler: async (ctx) => {
      const query = parsePayload(weeklyDigestQuerySchema, ctx.query, ctx.instance);
      await requireWorkspaceMember(deps, ctx, query.workspaceId);
      const digest = await deps.store.getWeeklyDigest(query.workspaceId, query.weekStart);
      if (digest === undefined) {
        throw notFound("weekly digest not found", ctx.instance);
      }
      return jsonResult(
        200,
        weeklyDigestResponseSchema.parse({
          velocityScore: digest.velocityScore,
          unresolvedBlockerCount: digest.unresolvedBlockerCount,
          compiledMd: digest.compiledMd,
        }),
      );
    },
  });
}

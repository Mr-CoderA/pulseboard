import { apiRoutes, authCredentialsSchema, authTokenResponseSchema } from "@pulseboard/types";
import { sessionCookieHeader } from "../auth/middleware.js";
import type { AppDependencies } from "../http/app.js";
import { badRequest, conflict, unauthorized } from "../http/errors.js";
import { parsePayload } from "../http/parse.js";
import { jsonResult } from "../http/response.js";
import type { AuthenticatedContext, RouteContext, Router } from "../http/router.js";
import { StoreConflictError } from "../store/errors.js";

function requireJsonObject(ctx: RouteContext): unknown {
  if (ctx.body === undefined) {
    throw badRequest("request body is required", ctx.instance);
  }
  return ctx.body;
}

export function registerAuthRoutes(router: Router, deps: AppDependencies): void {
  router.add({
    method: "POST",
    path: apiRoutes.auth.register,
    public: true,
    handler: async (ctx) => {
      const payload = parsePayload(authCredentialsSchema, requireJsonObject(ctx), ctx.instance);
      const passwordHash = await deps.passwords.hash(payload.password);
      try {
        const user = await deps.store.createUser({
          email: payload.email,
          passwordHash,
        });
        const token = deps.tokens.issue(user.id);
        const body = authTokenResponseSchema.parse({ token });
        return jsonResult(201, body, sessionCookieHeader(token, deps.cookies));
      } catch (error) {
        if (error instanceof StoreConflictError) {
          throw conflict("email already registered", ctx.instance);
        }
        throw error;
      }
    },
  });

  router.add({
    method: "POST",
    path: apiRoutes.auth.login,
    public: true,
    handler: async (ctx) => {
      const payload = parsePayload(authCredentialsSchema, requireJsonObject(ctx), ctx.instance);
      const user = await deps.store.findUserByEmail(payload.email);
      const passwordOk =
        user !== undefined && (await deps.passwords.verify(payload.password, user.passwordHash));
      if (user === undefined || !passwordOk) {
        throw unauthorized("invalid credentials", ctx.instance);
      }
      const token = deps.tokens.issue(user.id);
      const body = authTokenResponseSchema.parse({ token });
      return jsonResult(200, body, sessionCookieHeader(token, deps.cookies));
    },
  });
}

export function requireActor(ctx: RouteContext): AuthenticatedContext {
  if (ctx.actor === undefined) {
    throw unauthorized("authentication required", ctx.instance);
  }
  return ctx as AuthenticatedContext;
}

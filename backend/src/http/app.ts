import type { CookiePolicy } from "../auth/cookies.js";
import { authenticateRequest, sessionCookieHeader } from "../auth/middleware.js";
import type { PasswordHasher } from "../auth/passwords.js";
import type { TokenService } from "../auth/tokens.js";
import type { Clock } from "../clock.js";
import { registerAuthRoutes } from "../routes/auth.js";
import { registerStandupRoutes } from "../routes/standups.js";
import { registerWorkspaceRoutes } from "../routes/workspace.js";
import type { Store } from "../store/port.js";
import { HttpError, methodNotAllowed, notFound, unsupportedMediaType } from "./errors.js";
import {
  headerValue,
  isJsonContentType,
  normalizeHeaders,
  parseJsonBody,
  queryRecord,
  requestPath,
} from "./parse.js";
import type { DispatchHeaders, DispatchResult } from "./response.js";
import { problemResult, unexpectedResult } from "./response.js";
import { Router } from "./router.js";

export interface AppDependencies {
  readonly store: Store;
  readonly tokens: TokenService;
  readonly passwords: PasswordHasher;
  readonly clock: Clock;
  readonly cookies: CookiePolicy;
}

export interface IncomingDispatch {
  readonly method: string;
  readonly url: string;
  readonly headers: Record<string, string | string[] | undefined>;
  readonly rawBody: string;
}

export interface App {
  dispatch(input: IncomingDispatch): Promise<DispatchResult>;
}

function methodsNeedBody(method: string): boolean {
  return method === "POST" || method === "PATCH" || method === "PUT";
}

function withCookie(result: DispatchResult, token: string, cookies: CookiePolicy): DispatchResult {
  return {
    status: result.status,
    headers: {
      ...result.headers,
      ...sessionCookieHeader(token, cookies),
    },
    body: result.body,
  };
}

export function createApp(deps: AppDependencies): App {
  const router = new Router();
  registerAuthRoutes(router, deps);
  registerWorkspaceRoutes(router, deps);
  registerStandupRoutes(router, deps);

  return {
    async dispatch(input: IncomingDispatch): Promise<DispatchResult> {
      const method = input.method.toUpperCase();
      const { pathname, search } = requestPath(input.url);
      const instance = `${pathname}${search}`;
      const headers = normalizeHeaders(input.headers);

      try {
        const matched = router.match(method, pathname);
        if (matched === undefined) {
          throw notFound("no handler for this path", instance);
        }
        if ("allow" in matched) {
          throw methodNotAllowed(instance, matched.allow);
        }

        let body: unknown;
        if (methodsNeedBody(method)) {
          if (!isJsonContentType(headers["content-type"])) {
            throw unsupportedMediaType(instance);
          }
          body = parseJsonBody(input.rawBody, instance);
        }

        const auth = matched.route.public
          ? undefined
          : authenticateRequest({
              authorization: headerValue(headers, "authorization"),
              cookie: headerValue(headers, "cookie"),
              tokens: deps.tokens,
              instance,
              required: true,
            });

        const result = await matched.route.handler({
          method,
          path: pathname,
          query: queryRecord(
            new URLSearchParams(search.startsWith("?") ? search.slice(1) : search),
          ),
          params: matched.params,
          headers,
          body,
          actor: auth?.actor,
          instance,
        });

        if (auth?.actor.refreshedToken !== undefined) {
          return withCookie(result, auth.actor.refreshedToken, deps.cookies);
        }
        return result;
      } catch (cause) {
        if (cause instanceof HttpError) {
          return problemResult(cause, instance);
        }
        return unexpectedResult(instance);
      }
    },
  };
}

export type { DispatchHeaders, DispatchResult };

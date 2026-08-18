import type { Actor } from "./context.js";
import type { DispatchResult } from "./response.js";

export interface RouteContext {
  readonly method: string;
  readonly path: string;
  readonly query: Record<string, string>;
  readonly params: Record<string, string>;
  readonly headers: Record<string, string>;
  readonly body: unknown;
  readonly actor: Actor | undefined;
  readonly instance: string;
}

export interface AuthenticatedContext extends RouteContext {
  readonly actor: Actor;
}

export type RouteHandler = (ctx: RouteContext) => Promise<DispatchResult>;

export interface RouteDefinition {
  readonly method: string;
  readonly path: string;
  readonly public: boolean;
  readonly handler: RouteHandler;
}

interface CompiledRoute extends RouteDefinition {
  readonly pattern: RegExp;
  readonly paramNames: readonly string[];
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function compilePath(path: string): { pattern: RegExp; paramNames: string[] } {
  const paramNames: string[] = [];
  const source = path
    .split("/")
    .map((segment) => {
      if (segment.startsWith(":") && segment.length > 1) {
        paramNames.push(segment.slice(1));
        return "([^/]+)";
      }
      return escapeRegex(segment);
    })
    .join("/");
  return { pattern: new RegExp(`^${source}$`), paramNames };
}

export class Router {
  private readonly routes: CompiledRoute[] = [];

  add(definition: RouteDefinition): void {
    const compiled = compilePath(definition.path);
    this.routes.push({
      ...definition,
      method: definition.method.toUpperCase(),
      pattern: compiled.pattern,
      paramNames: compiled.paramNames,
    });
  }

  match(
    method: string,
    pathname: string,
  ): { route: CompiledRoute; params: Record<string, string> } | { allow: string } | undefined {
    const upper = method.toUpperCase();
    const allowed = new Set<string>();
    for (const route of this.routes) {
      const matched = route.pattern.exec(pathname);
      if (matched === null) {
        continue;
      }
      allowed.add(route.method);
      if (route.method !== upper) {
        continue;
      }
      const params: Record<string, string> = {};
      for (const [index, name] of route.paramNames.entries()) {
        const value = matched[index + 1];
        if (value !== undefined) {
          params[name] = decodeURIComponent(value);
        }
      }
      return { route, params };
    }
    if (allowed.size > 0) {
      return { allow: [...allowed].join(", ") };
    }
    return undefined;
  }
}

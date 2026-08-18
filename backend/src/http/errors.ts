import { ENV_NAMES, PROBLEM_TYPE_BLANK, type ProblemDetails } from "@pulseboard/types";

export class HttpError extends Error {
  readonly status: number;
  readonly title: string;
  readonly type: string;
  readonly detail?: string;
  readonly instance?: string;

  constructor(init: {
    readonly status: number;
    readonly title: string;
    readonly type?: string;
    readonly detail?: string;
    readonly instance?: string;
  }) {
    super(init.title);
    this.name = "HttpError";
    this.status = init.status;
    this.title = init.title;
    this.type = init.type ?? PROBLEM_TYPE_BLANK;
    if (init.detail !== undefined) {
      this.detail = init.detail;
    }
    if (init.instance !== undefined) {
      this.instance = init.instance;
    }
  }

  toProblem(): ProblemDetails {
    return {
      type: this.type,
      title: this.title,
      status: this.status,
      ...(this.detail !== undefined ? { detail: this.detail } : {}),
      ...(this.instance !== undefined ? { instance: this.instance } : {}),
    };
  }
}

export function badRequest(detail: string, instance: string): HttpError {
  return new HttpError({ status: 400, title: "Bad Request", detail, instance });
}

export function unauthorized(detail: string, instance: string): HttpError {
  return new HttpError({ status: 401, title: "Unauthorized", detail, instance });
}

export function forbidden(detail: string, instance: string): HttpError {
  return new HttpError({ status: 403, title: "Forbidden", detail, instance });
}

export function notFound(detail: string, instance: string): HttpError {
  return new HttpError({ status: 404, title: "Not Found", detail, instance });
}

export function conflict(detail: string, instance: string): HttpError {
  return new HttpError({ status: 409, title: "Conflict", detail, instance });
}

export function unsupportedMediaType(instance: string): HttpError {
  return new HttpError({
    status: 415,
    title: "Unsupported Media Type",
    detail: "content-type must be application/json",
    instance,
  });
}

export function methodNotAllowed(instance: string, allow: string): HttpError {
  return new HttpError({
    status: 405,
    title: "Method Not Allowed",
    detail: `allowed: ${allow}`,
    instance,
  });
}

export function internalError(instance: string): HttpError {
  return new HttpError({
    status: 500,
    title: "Internal Server Error",
    instance,
  });
}

export function missingEnv(name: string): Error {
  return new Error(`${name} is not set`);
}

export function readRequiredEnv(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name];
  if (value === undefined || value.trim().length === 0) {
    throw missingEnv(name);
  }
  return value.trim();
}

export function readAuthSecret(env: NodeJS.ProcessEnv = process.env): string {
  return readRequiredEnv(env, ENV_NAMES.BETTER_AUTH_SECRET);
}

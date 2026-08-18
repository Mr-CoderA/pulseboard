import type { ProblemDetails } from "@pulseboard/types";
import { problemDetailsSchema } from "@pulseboard/types";
import { type HttpError, internalError } from "./errors.js";

export const JSON_CONTENT_TYPE = "application/json; charset=utf-8";
export const PROBLEM_CONTENT_TYPE = "application/problem+json; charset=utf-8";

export interface DispatchHeaders {
  readonly [name: string]: string;
}

export interface DispatchResult {
  readonly status: number;
  readonly headers: DispatchHeaders;
  readonly body: string;
}

export function jsonResult(
  status: number,
  payload: unknown,
  extraHeaders?: DispatchHeaders,
): DispatchResult {
  return {
    status,
    headers: {
      "content-type": JSON_CONTENT_TYPE,
      ...extraHeaders,
    },
    body: JSON.stringify(payload),
  };
}

export function problemResult(error: HttpError, fallbackInstance: string): DispatchResult {
  const problem: ProblemDetails = {
    ...error.toProblem(),
    ...(error.instance === undefined ? { instance: fallbackInstance } : {}),
  };
  const body = problemDetailsSchema.parse(problem);
  const headers: Record<string, string> = {
    "content-type": PROBLEM_CONTENT_TYPE,
  };
  if (error.status === 405 && error.detail !== undefined && error.detail.startsWith("allowed: ")) {
    headers.allow = error.detail.slice("allowed: ".length);
  }
  return {
    status: error.status,
    headers,
    body: JSON.stringify(body),
  };
}

export function unexpectedResult(instance: string): DispatchResult {
  return problemResult(internalError(instance), instance);
}

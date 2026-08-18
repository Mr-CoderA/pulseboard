import { type ZodType, z } from "zod";
import { badRequest } from "./errors.js";

interface ZodIssueLike {
  readonly path: readonly (string | number | symbol)[];
  readonly message: string;
}

function issuesFromCause(cause: unknown): readonly ZodIssueLike[] {
  if (cause instanceof z.ZodError) {
    return cause.issues;
  }
  if (typeof cause === "object" && cause !== null && "issues" in cause) {
    const issues = cause.issues;
    if (Array.isArray(issues)) {
      return issues as ZodIssueLike[];
    }
  }
  return [];
}

export function parsePayload<T>(schema: ZodType<T>, value: unknown, instance: string): T {
  try {
    return schema.parse(value);
  } catch (cause) {
    const issues = issuesFromCause(cause);
    const first = issues[0];
    if (first === undefined) {
      throw badRequest("payload failed validation", instance);
    }
    const path = first.path.length > 0 ? first.path.map(String).join(".") : "payload";
    throw badRequest(`${path}: ${first.message}`, instance);
  }
}

export function headerValue(
  headers: Record<string, string | string[] | undefined>,
  name: string,
): string | undefined {
  const direct = headers[name] ?? headers[name.toLowerCase()];
  if (Array.isArray(direct)) {
    return direct[0];
  }
  return direct;
}

export function normalizeHeaders(
  headers: Record<string, string | string[] | undefined>,
): Record<string, string> {
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (value === undefined) {
      continue;
    }
    normalized[key.toLowerCase()] = Array.isArray(value) ? (value[0] ?? "") : value;
  }
  return normalized;
}

export function isJsonContentType(value: string | undefined): boolean {
  if (value === undefined) {
    return false;
  }
  const media = value.split(";")[0]?.trim().toLowerCase();
  return media === "application/json";
}

export function parseJsonBody(raw: string, instance: string): unknown {
  if (raw.trim().length === 0) {
    throw badRequest("request body is required", instance);
  }
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throw badRequest("request body must be valid JSON", instance);
  }
}

export function queryRecord(searchParams: URLSearchParams): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of searchParams.entries()) {
    result[key] = value;
  }
  return result;
}

export function requestPath(url: string): { readonly pathname: string; readonly search: string } {
  const parsed = new URL(url, "http://pulseboard.invalid");
  const pathname =
    parsed.pathname.length > 1 && parsed.pathname.endsWith("/")
      ? parsed.pathname.slice(0, -1)
      : parsed.pathname;
  return { pathname, search: parsed.search };
}

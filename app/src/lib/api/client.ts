import type {
  AuthCredentials,
  AuthTokenResponse,
  BlockerStatus,
  BlockerStatusResponse,
  CreateStandupRequest,
  CreateStandupResponse,
  CreateWorkspaceRequest,
  CreateWorkspaceResponse,
  ProblemDetails,
  Standup,
  WeeklyDigestResponse,
  Workspace,
} from "@pulseboard/types";
import {
  authCredentialsSchema,
  authTokenResponseSchema,
  blockerStatusResponseSchema,
  blockerStatusUpdateSchema,
  createStandupRequestSchema,
  createStandupResponseSchema,
  createWorkspaceRequestSchema,
  createWorkspaceResponseSchema,
  ENV_NAMES,
  PROBLEM_TYPE_BLANK,
  problemDetailsSchema,
  standupListQuerySchema,
  standupListSchema,
  weeklyDigestQuerySchema,
  weeklyDigestResponseSchema,
  workspaceListSchema,
} from "@pulseboard/types";
import type { ZodType } from "zod";
import { endpoints } from "./endpoints.js";

export class MissingApiOriginError extends Error {
  readonly problem: ProblemDetails;

  constructor() {
    super(`${ENV_NAMES.PUBLIC_API_ORIGIN} is not configured`);
    this.name = "MissingApiOriginError";
    this.problem = {
      type: PROBLEM_TYPE_BLANK,
      title: "API origin is not configured",
      status: 503,
      detail: `${ENV_NAMES.PUBLIC_API_ORIGIN} must be injected at deploy time. This client does not define a fallback origin.`,
    };
  }
}

export class ApiProblemError extends Error {
  readonly problem: ProblemDetails;

  constructor(problem: ProblemDetails) {
    super(problem.detail ?? problem.title);
    this.name = "ApiProblemError";
    this.problem = problem;
  }
}

export interface ApiClient {
  readonly origin: string;
  register(body: AuthCredentials): Promise<AuthTokenResponse>;
  login(body: AuthCredentials): Promise<AuthTokenResponse>;
  listWorkspaces(): Promise<Workspace[]>;
  createWorkspace(body: CreateWorkspaceRequest): Promise<CreateWorkspaceResponse>;
  createStandup(body: CreateStandupRequest): Promise<CreateStandupResponse>;
  listStandups(workspaceId: string, range: string): Promise<Standup[]>;
  updateBlockerStatus(id: string, status: BlockerStatus): Promise<BlockerStatusResponse>;
  weeklyDigest(workspaceId: string, weekStart: string): Promise<WeeklyDigestResponse>;
}

export function normalizeApiOrigin(origin: string | undefined): string | undefined {
  if (origin === undefined) {
    return undefined;
  }
  const trimmed = origin.trim().replace(/\/+$/, "");
  return trimmed.length > 0 ? trimmed : undefined;
}

export function createApiClient(
  origin: string | undefined,
  token?: string,
  fetchImpl: typeof fetch = fetch,
): ApiClient {
  const resolved = normalizeApiOrigin(origin);
  if (resolved === undefined) {
    return new UnconfiguredClient();
  }
  return new HttpApiClient(resolved, token, fetchImpl);
}

class UnconfiguredClient implements ApiClient {
  readonly origin = "";

  register(): Promise<AuthTokenResponse> {
    return Promise.reject(new MissingApiOriginError());
  }
  login(): Promise<AuthTokenResponse> {
    return Promise.reject(new MissingApiOriginError());
  }
  listWorkspaces(): Promise<Workspace[]> {
    return Promise.reject(new MissingApiOriginError());
  }
  createWorkspace(): Promise<CreateWorkspaceResponse> {
    return Promise.reject(new MissingApiOriginError());
  }
  createStandup(): Promise<CreateStandupResponse> {
    return Promise.reject(new MissingApiOriginError());
  }
  listStandups(): Promise<Standup[]> {
    return Promise.reject(new MissingApiOriginError());
  }
  updateBlockerStatus(): Promise<BlockerStatusResponse> {
    return Promise.reject(new MissingApiOriginError());
  }
  weeklyDigest(): Promise<WeeklyDigestResponse> {
    return Promise.reject(new MissingApiOriginError());
  }
}

class HttpApiClient implements ApiClient {
  constructor(
    readonly origin: string,
    private readonly token: string | undefined,
    private readonly fetchImpl: typeof fetch,
  ) {}

  register(body: AuthCredentials): Promise<AuthTokenResponse> {
    return this.send(
      "POST",
      endpoints.register,
      authTokenResponseSchema,
      authCredentialsSchema.parse(body),
    );
  }

  login(body: AuthCredentials): Promise<AuthTokenResponse> {
    return this.send(
      "POST",
      endpoints.login,
      authTokenResponseSchema,
      authCredentialsSchema.parse(body),
    );
  }

  listWorkspaces(): Promise<Workspace[]> {
    return this.send("GET", endpoints.workspaces, workspaceListSchema);
  }

  createWorkspace(body: CreateWorkspaceRequest): Promise<CreateWorkspaceResponse> {
    return this.send(
      "POST",
      endpoints.workspaces,
      createWorkspaceResponseSchema,
      createWorkspaceRequestSchema.parse(body),
    );
  }

  createStandup(body: CreateStandupRequest): Promise<CreateStandupResponse> {
    return this.send(
      "POST",
      endpoints.standups,
      createStandupResponseSchema,
      createStandupRequestSchema.parse(body),
    );
  }

  listStandups(workspaceId: string, range: string): Promise<Standup[]> {
    const query = standupListQuerySchema.parse({ workspaceId, range });
    const path = `${endpoints.standups}?workspaceId=${encodeURIComponent(query.workspaceId)}&range=${encodeURIComponent(query.range)}`;
    return this.send("GET", path, standupListSchema);
  }

  updateBlockerStatus(id: string, status: BlockerStatus): Promise<BlockerStatusResponse> {
    const payload = blockerStatusUpdateSchema.parse({ status });
    return this.send("PATCH", endpoints.blockerStatusFor(id), blockerStatusResponseSchema, payload);
  }

  weeklyDigest(workspaceId: string, weekStart: string): Promise<WeeklyDigestResponse> {
    const query = weeklyDigestQuerySchema.parse({ workspaceId, weekStart });
    const path = `${endpoints.weeklyDigest}?workspaceId=${encodeURIComponent(query.workspaceId)}&weekStart=${encodeURIComponent(query.weekStart)}`;
    return this.send("GET", path, weeklyDigestResponseSchema);
  }

  private async send<T>(
    method: string,
    path: string,
    schema: ZodType<T>,
    body?: unknown,
  ): Promise<T> {
    const headers: Record<string, string> = {
      accept: "application/json",
    };
    if (body !== undefined) {
      headers["content-type"] = "application/json";
    }
    if (this.token !== undefined && this.token.length > 0) {
      headers.authorization = `Bearer ${this.token}`;
    }

    const init: RequestInit = {
      method,
      credentials: "include",
      headers,
    };
    if (body !== undefined) {
      init.body = JSON.stringify(body);
    }

    const response = await this.fetchImpl(`${this.origin}${path}`, init);

    const text = await response.text();
    const parsed: unknown = text.length === 0 ? {} : parseJson(text);

    if (!response.ok) {
      const problem = problemDetailsSchema.safeParse(parsed);
      if (problem.success) {
        throw new ApiProblemError(problem.data);
      }
      throw new ApiProblemError({
        type: PROBLEM_TYPE_BLANK,
        title: "Request failed",
        status: response.status,
        detail: text.length > 0 ? text.slice(0, 280) : `HTTP ${String(response.status)}`,
      });
    }

    return schema.parse(parsed);
  }
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ApiProblemError({
      type: PROBLEM_TYPE_BLANK,
      title: "Invalid JSON response",
      status: 502,
    });
  }
}

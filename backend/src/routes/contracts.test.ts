import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  apiRoutes,
  authTokenResponseSchema,
  blockerStatusPath,
  blockerStatusResponseSchema,
  createStandupResponseSchema,
  createWorkspaceResponseSchema,
  type ProblemDetails,
  problemDetailsSchema,
  standupListSchema,
  weeklyDigestResponseSchema,
  workspaceListSchema,
} from "@pulseboard/types";
import { SESSION_COOKIE_NAME } from "../auth/cookies.js";
import { DEFAULT_TOKEN_TTL_SECONDS } from "../auth/tokens.js";
import { createHarness, invoke, sessionCookieHeader, TEST_NOW } from "../testing/harness.js";

const PASSWORD = "correct-horse";
const MEMBER_EMAIL = "member@example.com";

function expectProblem(
  result: { status: number; headers: Record<string, string>; body: unknown },
  status: number,
): ProblemDetails {
  assert.equal(result.status, status);
  assert.match(result.headers["content-type"] ?? "", /application\/problem\+json/);
  const problem = problemDetailsSchema.parse(result.body);
  assert.equal(problem.status, status);
  return problem;
}

async function register(
  app: ReturnType<typeof createHarness>["app"],
  email = MEMBER_EMAIL,
): Promise<string> {
  const result = await invoke(app, {
    method: "POST",
    path: apiRoutes.auth.register,
    body: { email, password: PASSWORD },
  });
  assert.equal(result.status, 201);
  const payload = authTokenResponseSchema.parse(result.body);
  assert.match(result.headers["set-cookie"] ?? "", new RegExp(`^${SESSION_COOKIE_NAME}=`));
  assert.match(result.headers["set-cookie"] ?? "", /HttpOnly/);
  assert.match(result.headers["set-cookie"] ?? "", /SameSite=Lax/);
  return payload.token;
}

async function createWorkspace(
  app: ReturnType<typeof createHarness>["app"],
  token: string,
  name = "Northwind",
  timezone = "America/New_York",
) {
  const result = await invoke(app, {
    method: "POST",
    path: apiRoutes.workspaces,
    token,
    body: { name, timezone },
  });
  assert.equal(result.status, 201);
  return createWorkspaceResponseSchema.parse(result.body);
}

describe("auth contracts", () => {
  it("registers with 201 { token } and rejects short passwords", async () => {
    const { app } = createHarness();
    const ok = await invoke(app, {
      method: "POST",
      path: apiRoutes.auth.register,
      body: { email: MEMBER_EMAIL, password: PASSWORD },
    });
    assert.equal(ok.status, 201);
    authTokenResponseSchema.parse(ok.body);

    const bad = await invoke(app, {
      method: "POST",
      path: apiRoutes.auth.register,
      body: { email: "other@example.com", password: "short" },
    });
    const problem = expectProblem(bad, 400);
    assert.match(problem.detail ?? "", /password/i);
  });

  it("rejects duplicate emails with 409 problem details", async () => {
    const { app } = createHarness();
    await register(app);
    const duplicate = await invoke(app, {
      method: "POST",
      path: apiRoutes.auth.register,
      body: { email: MEMBER_EMAIL.toUpperCase(), password: PASSWORD },
    });
    expectProblem(duplicate, 409);
  });

  it("rejects extra fields on the credential payload", async () => {
    const { app } = createHarness();
    const result = await invoke(app, {
      method: "POST",
      path: apiRoutes.auth.register,
      body: { email: MEMBER_EMAIL, password: PASSWORD, role: "admin" },
    });
    expectProblem(result, 400);
  });

  it("logs in with 200 { token } and rejects bad passwords without enumerating", async () => {
    const { app } = createHarness();
    await register(app);
    const ok = await invoke(app, {
      method: "POST",
      path: apiRoutes.auth.login,
      body: { email: MEMBER_EMAIL, password: PASSWORD },
    });
    assert.equal(ok.status, 200);
    authTokenResponseSchema.parse(ok.body);

    const wrong = await invoke(app, {
      method: "POST",
      path: apiRoutes.auth.login,
      body: { email: MEMBER_EMAIL, password: "not-the-password" },
    });
    const unknown = await invoke(app, {
      method: "POST",
      path: apiRoutes.auth.login,
      body: { email: "missing@example.com", password: PASSWORD },
    });
    const wrongProblem = expectProblem(wrong, 401);
    const unknownProblem = expectProblem(unknown, 401);
    assert.equal(wrongProblem.detail, unknownProblem.detail);
  });
});

describe("workspace contracts", () => {
  it("requires a bearer token or session cookie", async () => {
    const { app } = createHarness();
    const missing = await invoke(app, { method: "GET", path: apiRoutes.workspaces });
    expectProblem(missing, 401);
  });

  it("creates a workspace and lists it for the member", async () => {
    const { app } = createHarness();
    const token = await register(app);
    const created = await createWorkspace(app, token);
    assert.equal(created.name, "Northwind");
    assert.equal(created.timezone, "America/New_York");

    const listed = await invoke(app, { method: "GET", path: apiRoutes.workspaces, token });
    assert.equal(listed.status, 200);
    const workspaces = workspaceListSchema.parse(listed.body);
    assert.equal(workspaces.length, 1);
    const workspace = workspaces[0];
    assert.ok(workspace);
    assert.equal(workspace.id, created.id);
    assert.equal(workspace.createdBy.length, 36);
  });

  it("rejects invalid IANA timezones before persistence", async () => {
    const { app } = createHarness();
    const token = await register(app);
    const result = await invoke(app, {
      method: "POST",
      path: apiRoutes.workspaces,
      token,
      body: { name: "Broken", timezone: "Not/A_Zone" },
    });
    expectProblem(result, 400);
  });

  it("accepts the session cookie as an auth transport", async () => {
    const { app } = createHarness();
    const registered = await invoke(app, {
      method: "POST",
      path: apiRoutes.auth.register,
      body: { email: MEMBER_EMAIL, password: PASSWORD },
    });
    const cookie = sessionCookieHeader(registered.headers["set-cookie"]);
    const listed = await invoke(app, {
      method: "GET",
      path: apiRoutes.workspaces,
      headers: { cookie },
    });
    assert.equal(listed.status, 200);
    workspaceListSchema.parse(listed.body);
  });

  it("refreshes the session cookie when the JWT is near expiry", async () => {
    const { app, clock } = createHarness();
    const token = await register(app);
    clock.advance((DEFAULT_TOKEN_TTL_SECONDS - 60) * 1000);
    const listed = await invoke(app, { method: "GET", path: apiRoutes.workspaces, token });
    assert.equal(listed.status, 200);
    assert.match(listed.headers["set-cookie"] ?? "", new RegExp(`^${SESSION_COOKIE_NAME}=`));
  });
});

describe("standup contracts", () => {
  it("creates a standup dated in the workspace timezone", async () => {
    const { app } = createHarness(new Date("2026-08-18T03:00:00.000Z"));
    const token = await register(app);
    const workspace = await createWorkspace(app, token, "East", "America/New_York");
    const created = await invoke(app, {
      method: "POST",
      path: apiRoutes.standups,
      token,
      body: {
        workspaceId: workspace.id,
        yesterday: "Shipped schema validation.",
        today: "Wire route handlers.",
        rawBlockers: [{ description: "Waiting on DNS cutover" }],
      },
    });
    assert.equal(created.status, 201);
    createStandupResponseSchema.parse(created.body);

    const listed = await invoke(app, {
      method: "GET",
      path: `${apiRoutes.standups}?workspaceId=${workspace.id}&range=2026-08-17/2026-08-18`,
      token,
    });
    assert.equal(listed.status, 200);
    const standups = standupListSchema.parse(listed.body);
    assert.equal(standups.length, 1);
    const standup = standups[0];
    assert.ok(standup);
    assert.equal(standup.date, "2026-08-17");
    assert.equal(standup.rawBlockers.length, 1);
  });

  it("rejects a second standup on the same workspace-local date", async () => {
    const { app } = createHarness();
    const token = await register(app);
    const workspace = await createWorkspace(app, token, "UTC Desk", "UTC");
    const payload = {
      workspaceId: workspace.id,
      yesterday: "One",
      today: "Two",
      rawBlockers: [],
    };
    const first = await invoke(app, {
      method: "POST",
      path: apiRoutes.standups,
      token,
      body: payload,
    });
    assert.equal(first.status, 201);
    const second = await invoke(app, {
      method: "POST",
      path: apiRoutes.standups,
      token,
      body: payload,
    });
    expectProblem(second, 409);
  });

  it("rejects inverted standup ranges and unknown workspaces", async () => {
    const { app } = createHarness();
    const token = await register(app);
    const workspace = await createWorkspace(app, token);
    const inverted = await invoke(app, {
      method: "GET",
      path: `${apiRoutes.standups}?workspaceId=${workspace.id}&range=2026-08-18/2026-08-01`,
      token,
    });
    expectProblem(inverted, 400);

    const missing = await invoke(app, {
      method: "GET",
      path: `${apiRoutes.standups}?workspaceId=33333333-3333-4333-8333-333333333333&range=2026-08-01/2026-08-18`,
      token,
    });
    expectProblem(missing, 404);
  });

  it("forbids standup access for non-members", async () => {
    const { app } = createHarness();
    const ownerToken = await register(app, "owner@example.com");
    const otherToken = await register(app, "other@example.com");
    const workspace = await createWorkspace(app, ownerToken);
    const result = await invoke(app, {
      method: "POST",
      path: apiRoutes.standups,
      token: otherToken,
      body: {
        workspaceId: workspace.id,
        yesterday: "Y",
        today: "T",
        rawBlockers: [],
      },
    });
    expectProblem(result, 403);
  });
});

describe("blocker and digest contracts", () => {
  it("patches blocker status and returns { status }", async () => {
    const { app, store } = createHarness();
    const token = await register(app);
    const workspace = await createWorkspace(app, token, "UTC Desk", "UTC");
    const created = await invoke(app, {
      method: "POST",
      path: apiRoutes.standups,
      token,
      body: {
        workspaceId: workspace.id,
        yesterday: "Y",
        today: "T",
        rawBlockers: [{ description: "Flaky CI" }],
      },
    });
    const standup = createStandupResponseSchema.parse(created.body);
    const blockers = await store.listBlockersForStandup(standup.id);
    const blocker = blockers[0];
    assert.ok(blocker);

    const patched = await invoke(app, {
      method: "PATCH",
      path: blockerStatusPath(blocker.id),
      token,
      body: { status: "RESOLVED" },
    });
    assert.equal(patched.status, 200);
    assert.deepEqual(blockerStatusResponseSchema.parse(patched.body), { status: "RESOLVED" });

    const invalid = await invoke(app, {
      method: "PATCH",
      path: blockerStatusPath(blocker.id),
      token,
      body: { status: "DONE" },
    });
    expectProblem(invalid, 400);
  });

  it("returns a weekly digest payload and rejects non-Monday weekStart", async () => {
    const { app, store } = createHarness();
    const token = await register(app);
    const workspace = await createWorkspace(app, token);
    await store.saveWeeklyDigest({
      workspaceId: workspace.id,
      weekStart: "2026-08-17",
      velocityScore: 0.82,
      unresolvedBlockerCount: 3,
      compiledMd: "## Week of 2026-08-17\n\nThree unresolved blockers.",
    });

    const found = await invoke(app, {
      method: "GET",
      path: `${apiRoutes.weeklyDigest}?workspaceId=${workspace.id}&weekStart=2026-08-17`,
      token,
    });
    assert.equal(found.status, 200);
    const digest = weeklyDigestResponseSchema.parse(found.body);
    assert.equal(digest.unresolvedBlockerCount, 3);
    assert.equal(digest.velocityScore, 0.82);

    const notMonday = await invoke(app, {
      method: "GET",
      path: `${apiRoutes.weeklyDigest}?workspaceId=${workspace.id}&weekStart=2026-08-18`,
      token,
    });
    expectProblem(notMonday, 400);

    const missing = await invoke(app, {
      method: "GET",
      path: `${apiRoutes.weeklyDigest}?workspaceId=${workspace.id}&weekStart=2026-08-10`,
      token,
    });
    expectProblem(missing, 404);
  });
});

describe("HTTP envelope", () => {
  it("returns 405 with Allow when the path exists for another method", async () => {
    const { app } = createHarness();
    const result = await invoke(app, { method: "GET", path: apiRoutes.auth.register });
    const problem = expectProblem(result, 405);
    assert.match(problem.detail ?? "", /POST/);
    assert.equal(result.headers.allow, "POST");
  });

  it("returns 415 when JSON content-type is missing", async () => {
    const { app } = createHarness();
    const result = await invoke(app, {
      method: "POST",
      path: apiRoutes.auth.register,
      rawBody: JSON.stringify({ email: MEMBER_EMAIL, password: PASSWORD }),
    });
    expectProblem(result, 415);
  });

  it("returns 400 for malformed JSON", async () => {
    const { app } = createHarness();
    const result = await invoke(app, {
      method: "POST",
      path: apiRoutes.auth.register,
      headers: { "content-type": "application/json" },
      rawBody: "{not-json",
    });
    expectProblem(result, 400);
  });

  it("returns 404 problem details for unknown paths", async () => {
    const { app } = createHarness();
    const token = await register(app);
    const result = await invoke(app, { method: "GET", path: "/api/v1/nope", token });
    expectProblem(result, 404);
  });

  it("freezes standup dates against TEST_NOW in UTC workspaces", async () => {
    assert.equal(TEST_NOW.toISOString(), "2026-08-18T15:00:00.000Z");
    const { app } = createHarness();
    const token = await register(app);
    const workspace = await createWorkspace(app, token, "UTC Desk", "UTC");
    await invoke(app, {
      method: "POST",
      path: apiRoutes.standups,
      token,
      body: {
        workspaceId: workspace.id,
        yesterday: "Y",
        today: "T",
        rawBlockers: [],
      },
    });
    const listed = await invoke(app, {
      method: "GET",
      path: `${apiRoutes.standups}?workspaceId=${workspace.id}&range=2026-08-18/2026-08-18`,
      token,
    });
    const standups = standupListSchema.parse(listed.body);
    assert.equal(standups[0]?.date, "2026-08-18");
  });
});

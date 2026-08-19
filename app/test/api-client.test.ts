import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { apiRoutes } from "@pulseboard/types";
import { ApiProblemError, createApiClient, MissingApiOriginError } from "../src/lib/api/client.js";
import { endpoints } from "../src/lib/api/endpoints.js";

describe("API client", () => {
  it("exposes shared /api/v1 paths", () => {
    assert.equal(endpoints.prefix, "/api/v1");
    assert.equal(endpoints.register, apiRoutes.auth.register);
    assert.equal(endpoints.login, apiRoutes.auth.login);
    assert.equal(endpoints.workspaces, apiRoutes.workspaces);
    assert.equal(endpoints.standups, apiRoutes.standups);
    assert.equal(endpoints.weeklyDigest, apiRoutes.weeklyDigest);
    assert.equal(endpoints.blockerStatusFor("abc"), "/api/v1/blockers/abc/status");
  });

  it("rejects calls when PUBLIC_API_ORIGIN is unset — no local fallback", async () => {
    const client = createApiClient(undefined);
    await assert.rejects(
      () => client.login({ email: "member@example.com", password: "correct-horse" }),
      (error: unknown) => {
        assert.equal(error instanceof MissingApiOriginError, true);
        assert.equal((error as MissingApiOriginError).problem.status, 503);
        return true;
      },
    );
    const blank = createApiClient("   ");
    await assert.rejects(() => blank.listWorkspaces(), MissingApiOriginError);
  });

  it("POSTs login credentials and parses { token }", async () => {
    const token = "t".repeat(24);
    const fetchImpl: typeof fetch = async (input, init) => {
      assert.equal(String(input), "https://api.example.invalid/api/v1/auth/login");
      assert.equal(init?.method, "POST");
      assert.equal(init?.credentials, "include");
      const body = JSON.parse(String(init?.body)) as { email: string };
      assert.equal(body.email, "member@example.com");
      return new Response(JSON.stringify({ token }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    };
    const client = createApiClient("https://api.example.invalid/", token, fetchImpl);
    const result = await client.login({ email: "member@example.com", password: "correct-horse" });
    assert.equal(result.token, token);
  });

  it("surfaces RFC 7807 problem details on failure", async () => {
    const fetchImpl: typeof fetch = async () =>
      new Response(
        JSON.stringify({
          type: "about:blank",
          title: "Unauthorized",
          status: 401,
          detail: "token expired",
        }),
        { status: 401, headers: { "content-type": "application/problem+json" } },
      );
    const client = createApiClient("https://api.example.invalid", undefined, fetchImpl);
    await assert.rejects(
      () => client.listWorkspaces(),
      (error: unknown) => {
        assert.equal(error instanceof ApiProblemError, true);
        assert.equal((error as ApiProblemError).problem.status, 401);
        assert.equal((error as ApiProblemError).problem.detail, "token expired");
        return true;
      },
    );
  });

  it("parses GET /standups list entries with blockers and keeps credentials include", async () => {
    const workspaceId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const standupId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    const blockerId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
    const fetchImpl: typeof fetch = async (input, init) => {
      assert.equal(
        String(input),
        `https://api.example.invalid/api/v1/standups?workspaceId=${workspaceId}&range=2026-08-17%2F2026-08-18`,
      );
      assert.equal(init?.method, "GET");
      assert.equal(init?.credentials, "include");
      return new Response(
        JSON.stringify([
          {
            id: standupId,
            userId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
            workspaceId,
            date: "2026-08-17",
            yesterday: "Y",
            today: "T",
            rawBlockers: [{ description: "Flaky CI" }],
            submittedAt: "2026-08-17T13:00:00.000Z",
            blockers: [
              {
                id: blockerId,
                standupId,
                description: "Flaky CI",
                status: "OPEN",
                flaggedAfterDays: 2,
                createdAt: "2026-08-17T13:00:00.000Z",
              },
            ],
          },
        ]),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    };
    const client = createApiClient("https://api.example.invalid", undefined, fetchImpl);
    const listed = await client.listStandups(workspaceId, "2026-08-17/2026-08-18");
    assert.equal(listed[0]?.blockers[0]?.id, blockerId);
    assert.equal(listed[0]?.blockers[0]?.status, "OPEN");
  });
});

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
});

import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import type { CreateWorkspaceResponse, Workspace } from "@pulseboard/types";
import { PROBLEM_TYPE_BLANK } from "@pulseboard/types";
import { type ApiClient, ApiProblemError, MissingApiOriginError } from "../src/lib/api/client.js";
import { ATLAS_WORKSPACE } from "../src/lib/preview/catalog.js";
import { utcMondayWeekStart } from "../src/lib/time/standup-window.js";
import {
  PREVIEW_WORKSPACE_ID,
  resetMemberWorkspaceResolver,
  resolveMemberWorkspace,
} from "../src/lib/workspace/member-session.js";

function problem(status: number): ApiProblemError {
  return new ApiProblemError({
    type: PROBLEM_TYPE_BLANK,
    title: "Denied",
    status,
  });
}

function workspace(overrides: Partial<Workspace> = {}): Workspace {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Other",
    timezone: "UTC",
    createdBy: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    createdAt: "2026-08-18T15:00:00.000Z",
    ...overrides,
  };
}

function fakeClient(options: {
  list?: () => Promise<Workspace[]>;
  create?: (body: { name: string; timezone: string }) => Promise<CreateWorkspaceResponse>;
}): ApiClient {
  const missing = (): never => {
    throw new Error("unexpected client call");
  };
  return {
    origin: "https://api.example.invalid",
    register: missing,
    login: missing,
    listWorkspaces: options.list ?? missing,
    createWorkspace: options.create ?? missing,
    createStandup: missing,
    listStandups: missing,
    updateBlockerStatus: missing,
    weeklyDigest: missing,
  };
}

describe("member workspace resolver", () => {
  afterEach(() => {
    resetMemberWorkspaceResolver();
  });

  it("exports the editorial Atlas id without using it as a default", () => {
    assert.equal(PREVIEW_WORKSPACE_ID, ATLAS_WORKSPACE.id);
    assert.equal(PREVIEW_WORKSPACE_ID, "8f3c2a10-6b21-4d0e-9c4a-1b7e5d2f90aa");
  });

  it("returns anonymous on 401 and 403 without creating a workspace", async () => {
    for (const status of [401, 403]) {
      resetMemberWorkspaceResolver();
      let created = 0;
      const session = await resolveMemberWorkspace(
        fakeClient({
          list: async () => {
            throw problem(status);
          },
          create: async () => {
            created += 1;
            throw new Error("must not create");
          },
        }),
      );
      assert.equal(session.kind, "anonymous");
      assert.equal(created, 0);
    }
  });

  it("returns anonymous when the API origin is unset", async () => {
    const session = await resolveMemberWorkspace(
      fakeClient({
        list: async () => {
          throw new MissingApiOriginError();
        },
      }),
    );
    assert.equal(session.kind, "anonymous");
  });

  it("creates Atlas once when the list is empty, including concurrent callers", async () => {
    let lists = 0;
    let creates = 0;
    const created: CreateWorkspaceResponse = {
      id: "99999999-9999-4999-8999-999999999999",
      name: ATLAS_WORKSPACE.name,
      timezone: ATLAS_WORKSPACE.timezone,
    };
    const client = fakeClient({
      list: async () => {
        lists += 1;
        return [];
      },
      create: async (body) => {
        creates += 1;
        assert.equal(body.name, ATLAS_WORKSPACE.name);
        assert.equal(body.timezone, ATLAS_WORKSPACE.timezone);
        assert.notEqual(created.id, PREVIEW_WORKSPACE_ID);
        return created;
      },
    });
    const [first, second] = await Promise.all([
      resolveMemberWorkspace(client),
      resolveMemberWorkspace(client),
    ]);
    assert.equal(lists, 1);
    assert.equal(creates, 1);
    assert.equal(first.kind, "member");
    assert.equal(second.kind, "member");
    if (first.kind === "member" && second.kind === "member") {
      assert.equal(first.workspace.id, created.id);
      assert.equal(second.workspace.id, created.id);
    }
  });

  it("prefers the named Atlas row over the first workspace", async () => {
    const atlas = workspace({
      id: "22222222-2222-4222-8222-222222222222",
      name: "Atlas",
      timezone: "America/New_York",
    });
    const session = await resolveMemberWorkspace(
      fakeClient({
        list: async () => [workspace(), atlas],
      }),
    );
    assert.equal(session.kind, "member");
    if (session.kind === "member") {
      assert.equal(session.workspace.id, atlas.id);
      assert.notEqual(session.workspace.id, PREVIEW_WORKSPACE_ID);
    }
  });

  it("uses a member row even when its id matches the preview fixture", async () => {
    const row = workspace({
      id: PREVIEW_WORKSPACE_ID,
      name: "Atlas",
      timezone: "America/New_York",
    });
    const session = await resolveMemberWorkspace(
      fakeClient({
        list: async () => [row],
      }),
    );
    assert.equal(session.kind, "member");
    if (session.kind === "member") {
      assert.equal(session.workspace.id, PREVIEW_WORKSPACE_ID);
    }
  });

  it("computes a UTC Monday weekStart", () => {
    assert.equal(utcMondayWeekStart(new Date("2026-08-19T18:00:00.000Z")), "2026-08-17");
    assert.equal(utcMondayWeekStart(new Date("2026-08-17T00:00:00.000Z")), "2026-08-17");
  });
});

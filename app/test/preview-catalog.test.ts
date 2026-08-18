import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  blockerSchema,
  standupSchema,
  weeklyDigestSchema,
  workspaceSchema,
} from "@pulseboard/types";
import {
  ATLAS_WORKSPACE,
  PREVIEW_BLOCKERS,
  PREVIEW_DIGEST,
  PREVIEW_NOW,
  PREVIEW_STANDUPS,
  standupsInRange,
} from "../src/lib/preview/catalog.js";
import { workspaceClock } from "../src/lib/time/standup-window.js";
import { match as matchWorkspace } from "../src/params/workspace.js";

describe("preview catalog and zone clock", () => {
  it("validates fixtures against shared Zod entity schemas", () => {
    const { slug: _slug, ...workspace } = ATLAS_WORKSPACE;
    void _slug;
    workspaceSchema.parse(workspace);
    for (const standup of PREVIEW_STANDUPS) {
      standupSchema.parse(standup);
    }
    for (const blocker of PREVIEW_BLOCKERS) {
      blockerSchema.parse(blocker);
    }
    weeklyDigestSchema.parse(PREVIEW_DIGEST);
  });

  it("filters history by inclusive date range", () => {
    const slice = standupsInRange("2026-08-14", "2026-08-18");
    assert.equal(slice.length, 3);
    assert.equal(slice[0]?.date, "2026-08-18");
  });

  it("computes Atlas local time and a closed standup window at PREVIEW_NOW", () => {
    const clock = workspaceClock(ATLAS_WORKSPACE.timezone, PREVIEW_NOW);
    assert.equal(clock.isoDate, "2026-08-18");
    assert.equal(clock.windowOpen, false);
    assert.equal(clock.timezone, "America/New_York");
  });

  it("accepts workspace slugs that match the static param rule", () => {
    assert.equal(matchWorkspace("atlas"), true);
    assert.equal(matchWorkspace("Atlas"), false);
    assert.equal(matchWorkspace(""), false);
  });
});

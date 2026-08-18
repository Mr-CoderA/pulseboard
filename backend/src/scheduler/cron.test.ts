import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ENV_NAMES } from "@pulseboard/types";
import { createSchedulerPort, readSchedulerConfig, SCHEDULER_JOBS } from "./cron.js";

describe("scheduler port", () => {
  it("requires endpoint and key names without contacting a provider", () => {
    assert.throws(() => readSchedulerConfig({}), new RegExp(ENV_NAMES.SCHEDULER_ENDPOINT));
    const config = readSchedulerConfig({
      [ENV_NAMES.SCHEDULER_ENDPOINT]: "https://scheduler.example.invalid/enqueue",
      [ENV_NAMES.SCHEDULER_KEY]: "test-scheduler-key-value",
    });
    assert.equal(config.endpoint, "https://scheduler.example.invalid/enqueue");
  });

  it("posts job payloads through the injected fetch implementation", async () => {
    const seen: { url: string; body: string }[] = [];
    const port = createSchedulerPort(
      {
        endpoint: "https://scheduler.example.invalid/enqueue",
        key: "test-scheduler-key-value",
      },
      async (input, init) => {
        seen.push({ url: String(input), body: String(init?.body) });
        return new Response(null, { status: 202 });
      },
    );
    await port.enqueue(SCHEDULER_JOBS.weeklyDigest, {
      workspaceId: "33333333-3333-4333-8333-333333333333",
    });
    assert.equal(seen.length, 1);
    assert.match(seen[0]?.body ?? "", /weekly-digest.compile/);
  });
});

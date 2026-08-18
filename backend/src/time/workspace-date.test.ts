import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calendarDateInZone } from "./workspace-date.js";

describe("workspace calendar dates", () => {
  it("uses the workspace zone rather than UTC near midnight", () => {
    const instant = new Date("2026-08-18T03:00:00.000Z");
    assert.equal(calendarDateInZone(instant, "UTC"), "2026-08-18");
    assert.equal(calendarDateInZone(instant, "America/New_York"), "2026-08-17");
    assert.equal(calendarDateInZone(instant, "Pacific/Auckland"), "2026-08-18");
  });
});

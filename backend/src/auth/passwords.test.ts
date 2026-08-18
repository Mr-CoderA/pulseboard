import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createScryptHasher } from "./passwords.js";

describe("scrypt hasher", () => {
  it("verifies a hash and rejects a wrong password", async () => {
    const hasher = createScryptHasher({ cost: 4 });
    const hash = await hasher.hash("correct-horse");
    assert.equal(true, await hasher.verify("correct-horse", hash));
    assert.equal(false, await hasher.verify("wrong-password", hash));
    assert.equal(false, await hasher.verify("correct-horse", "not-a-scrypt-hash-------------"));
  });
});

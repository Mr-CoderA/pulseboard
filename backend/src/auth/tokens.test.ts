import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FrozenClock } from "../clock.js";
import {
  createTokenService,
  DEFAULT_REFRESH_WITHIN_SECONDS,
  DEFAULT_TOKEN_TTL_SECONDS,
} from "./tokens.js";

const SECRET = "pulseboard-test-hmac-secret";

describe("token service", () => {
  it("round-trips a member JWT and rejects tampering", () => {
    const clock = new FrozenClock(new Date("2026-08-18T15:00:00.000Z"));
    const tokens = createTokenService({
      secret: SECRET,
      clock,
      ttlSeconds: DEFAULT_TOKEN_TTL_SECONDS,
      refreshWithinSeconds: DEFAULT_REFRESH_WITHIN_SECONDS,
    });
    const token = tokens.issue("11111111-1111-4111-8111-111111111111");
    const claims = tokens.verify(token);
    assert.equal(claims.role, "member");
    assert.equal(claims.sub, "11111111-1111-4111-8111-111111111111");
    assert.equal(false, tokens.shouldRefresh(claims));

    const tampered = `${token.slice(0, -2)}aa`;
    assert.throws(() => tokens.verify(tampered));
  });

  it("expires after ttl and refreshes inside the window", () => {
    const clock = new FrozenClock(new Date("2026-08-18T15:00:00.000Z"));
    const tokens = createTokenService({
      secret: SECRET,
      clock,
      ttlSeconds: DEFAULT_TOKEN_TTL_SECONDS,
      refreshWithinSeconds: DEFAULT_REFRESH_WITHIN_SECONDS,
    });
    const token = tokens.issue("11111111-1111-4111-8111-111111111111");
    clock.advance((DEFAULT_TOKEN_TTL_SECONDS - 60) * 1000);
    const claims = tokens.verify(token);
    assert.equal(true, tokens.shouldRefresh(claims));

    clock.advance(120_000);
    assert.throws(() => tokens.verify(token), /expired/);
  });
});

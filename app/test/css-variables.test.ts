import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  COLOR_TOKENS,
  CSS_TOKEN_MAP,
  MOTION_TOKENS,
  SPACE_TOKENS,
} from "../src/lib/styles/tokens.js";
import tailwind from "../tailwind.config.ts";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cssPath = path.join(appRoot, "src/lib/styles/global.css");

describe("CSS variable pipeline", () => {
  const css = readFileSync(cssPath, "utf8");

  it("declares every token name in :root", () => {
    for (const name of Object.keys(CSS_TOKEN_MAP)) {
      const pattern = new RegExp(`${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*:`);
      assert.match(css, pattern, `missing ${name}`);
    }
  });

  it("locks the specified ink, surface, and accent values", () => {
    assert.match(css, /--pb-ink:\s*#111827/i);
    assert.match(css, /--pb-surface:\s*#f9fafb/i);
    assert.match(css, /--pb-accent:\s*#2563eb/i);
  });

  it("uses an 8px modular scale and 24px/32px section rhythm", () => {
    assert.equal(SPACE_TOKENS["--pb-space-1"], "8px");
    assert.equal(SPACE_TOKENS["--pb-block-gap"], "24px");
    assert.equal(SPACE_TOKENS["--pb-section-gap"], "32px");
    assert.match(css, /--pb-space-1:\s*8px/);
    assert.match(css, /--pb-block-gap:\s*24px/);
    assert.match(css, /--pb-section-gap:\s*32px/);
  });

  it("encodes the 150ms cubic-bezier(0.4, 0, 0.2, 1) motion contract", () => {
    assert.equal(MOTION_TOKENS["--pb-duration"], "150ms");
    assert.equal(MOTION_TOKENS["--pb-ease"], "cubic-bezier(0.4, 0, 0.2, 1)");
    assert.match(css, /--pb-duration:\s*150ms/);
    assert.match(css, /--pb-ease:\s*cubic-bezier\(0\.4, 0, 0\.2, 1\)/);
  });

  it("does not use gradients or default card shadows", () => {
    assert.doesNotMatch(css, /linear-gradient|radial-gradient|conic-gradient/);
    assert.doesNotMatch(css, /box-shadow:\s*[^;]*rgba?/);
    assert.doesNotMatch(css, /border-radius:\s*(4px|8px|0\.5rem|0\.75rem)/);
  });

  it("maps Tailwind theme colors onto the same CSS variables", () => {
    const mapped = tailwind.theme.extend.colors;
    const mappedValues: readonly string[] = Object.values(mapped);
    for (const cssName of Object.keys(COLOR_TOKENS)) {
      const found = mappedValues.includes(`var(${cssName})`);
      assert.equal(found, true, `tailwind theme missing var(${cssName})`);
    }
  });

  it("keeps the token source file on disk", () => {
    assert.equal(existsSync(path.join(appRoot, "src/lib/styles/tokens.ts")), true);
    assert.equal(existsSync(cssPath), true);
    assert.equal(existsSync(path.join(appRoot, "tailwind.config.ts")), true);
  });
});

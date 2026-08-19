import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  AUTH_PATHS,
  POST_AUTH_PATH,
  PREVIEW_WORKSPACES,
  prerenderEntriesFor,
  REQUIRED_LAYOUT_FILES,
  STATIC_PRERENDER_PATHS,
  STATIC_ROUTE_FILES,
  workspaceCoverPath,
} from "../src/lib/routes/manifest.js";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function prerenderedFile(routePath: string): boolean {
  const buildDir = path.join(appRoot, "build");
  if (routePath === "/") {
    return existsSync(path.join(buildDir, "index.html"));
  }
  const htmlFile = path.join(buildDir, `${routePath.slice(1)}.html`);
  const indexFile = path.join(buildDir, routePath.slice(1), "index.html");
  return existsSync(htmlFile) || existsSync(indexFile);
}

describe("static route assertions", () => {
  it("ships every declared route source file", () => {
    for (const route of STATIC_ROUTE_FILES) {
      const full = path.join(appRoot, route.source);
      assert.equal(existsSync(full), true, `missing ${route.source}`);
      assert.equal(route.prerender, true);
    }
  });

  it("ships layout, component, style, and API client files", () => {
    for (const relative of REQUIRED_LAYOUT_FILES) {
      assert.equal(existsSync(path.join(appRoot, relative)), true, `missing ${relative}`);
    }
  });

  it("covers auth, workspace desks, and lead summary", () => {
    const paths = STATIC_ROUTE_FILES.map((route) => route.path);
    assert.deepEqual(AUTH_PATHS.slice(), ["/auth/login", "/auth/register"]);
    assert.equal(paths.includes("/[workspace]/dashboard"), true);
    assert.equal(paths.includes("/[workspace]/standup"), true);
    assert.equal(paths.includes("/[workspace]/history"), true);
    assert.equal(paths.includes("/[workspace]/lead/summary"), true);
  });

  it("prerenders preview workspaces from the entries table", () => {
    assert.deepEqual(PREVIEW_WORKSPACES.slice(), ["atlas"]);
    const atlas = prerenderEntriesFor("atlas");
    assert.deepEqual(atlas.slice(), [
      "/atlas",
      "/atlas/dashboard",
      "/atlas/standup",
      "/atlas/history",
      "/atlas/lead/summary",
    ]);
    assert.equal(STATIC_PRERENDER_PATHS.includes("/"), true);
    for (const entry of atlas) {
      assert.equal(STATIC_PRERENDER_PATHS.includes(entry), true, `missing prerender path ${entry}`);
    }
  });

  it("marks the root layout as prerendered with no trailing slash", () => {
    const layout = readFileSync(path.join(appRoot, "src/routes/+layout.ts"), "utf8");
    assert.match(layout, /export const prerender = true/);
    assert.match(layout, /export const trailingSlash = "never"/);
    const dashboardEntries = readFileSync(
      path.join(appRoot, "src/routes/[workspace]/dashboard/+page.ts"),
      "utf8",
    );
    assert.match(dashboardEntries, /export \{ entries \}/);
    assert.match(dashboardEntries, /export const prerender = true/);
  });

  it("sends successful login and register to the Atlas cover", () => {
    assert.equal(POST_AUTH_PATH, "/atlas");
    assert.equal(POST_AUTH_PATH, workspaceCoverPath(PREVIEW_WORKSPACES[0]));
    assert.equal(STATIC_PRERENDER_PATHS.includes(POST_AUTH_PATH), true);
    assert.equal(prerenderEntriesFor("atlas")[0], POST_AUTH_PATH);

    const login = readFileSync(path.join(appRoot, "src/routes/auth/login/+page.svelte"), "utf8");
    const register = readFileSync(
      path.join(appRoot, "src/routes/auth/register/+page.svelte"),
      "utf8",
    );
    for (const source of [login, register]) {
      assert.match(source, /from "\$app\/navigation"/);
      assert.match(source, /await goto\(POST_AUTH_PATH\)/);
      assert.match(source, /role="alert"/);
      assert.equal(source.includes("Session accepted. Continue to a workspace floor."), false);
      assert.equal(source.includes("Member created. Sign in when you are ready to file."), false);
    }
    assert.match(login, /SameSite=None; Secure; HttpOnly/);
    assert.equal(login.includes("SameSite=Lax"), false);
  });

  it("ships the member workspace resolver beside adapter-static prerender", () => {
    assert.equal(existsSync(path.join(appRoot, "src/lib/workspace/member-session.ts")), true);
  });

  it("configures adapter-static with strict prerender", () => {
    const config = readFileSync(path.join(appRoot, "svelte.config.js"), "utf8");
    assert.match(config, /adapter-static/);
    assert.match(config, /strict:\s*true/);
    assert.match(config, /entries:\s*\["\*"\]/);
    assert.match(config, /fallback:\s*undefined/);
  });

  it("emits prerendered HTML for every static path after build", (t) => {
    const buildDir = path.join(appRoot, "build");
    if (!existsSync(buildDir)) {
      t.skip("vite build has not produced app/build yet");
      return;
    }
    for (const routePath of STATIC_PRERENDER_PATHS) {
      assert.equal(prerenderedFile(routePath), true, `build missing ${routePath}`);
    }
  });
});

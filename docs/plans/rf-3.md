# RF-3

# RF-3: Atlas floors over a cross-origin session

## Scope

Wire the prerendered Atlas site (`/atlas`, `/atlas/dashboard`, `/atlas/standup`, `/atlas/history`, `/atlas/lead/summary`) to the live `/api/v1` API for a signed-in member when `PUBLIC_API_ORIGIN` is set and a session cookie authenticates. Anonymous visitors and prerender/build continue to use editorial fixtures in [`app/src/lib/preview/catalog.ts`](app/src/lib/preview/catalog.ts) (`ATLAS_WORKSPACE.id` `8f3c2a10-6b21-4d0e-9c4a-1b7e5d2f90aa`). Do not change [`app/svelte.config.js`](app/svelte.config.js) (`adapter-static`, `fallback: undefined`, `strict: true`), `prerender = true`, or [`entries()`](app/src/lib/routes/manifest.ts). Do not persist `AuthTokenResponse.token`. Do not construct `createSchedulerPort` in [`backend/src/index.ts`](backend/src/index.ts) `main()`, compile digests in-process, or run migrations inside `listen()`.

PostgreSQL stays host-managed via `DATABASE_URL` (`sslmode=require`). The host applies schema with `npm run db:migrate` in `@pulseboard/backend` (script already [`backend/package.json`](backend/package.json) `db:migrate` → [`backend/src/db/migrate.ts`](backend/src/db/migrate.ts)). Cross-origin credentials require the host to set at least one of `CORS_ORIGIN` / `ALLOWED_ORIGINS` / `FRONTEND_URL` / `APP_URL` to the static app origin (comma-separated, no trailing slash). [`allowedOrigins`](backend/src/index.ts) and `Access-Control-Allow-Credentials` already exist; do not add a compose service.

## Files to change

- [`backend/src/auth/cookies.ts`](backend/src/auth/cookies.ts) — `CookiePolicy.sameSite` and `defaultCookiePolicy`: `SameSite=None` with existing `Secure` + `HttpOnly`.
- [`backend/src/routes/contracts.test.ts`](backend/src/routes/contracts.test.ts) — cookie assertion currently `/SameSite=Lax/`; GET standups body once blockers are attached.
- [`backend/src/routes/standups.ts`](backend/src/routes/standups.ts) — `GET` `apiRoutes.standups`: after `listStandups`, attach `listBlockersForStandup` per standup (existing store method). No new path.
- [`packages/types/src/schemas.ts`](packages/types/src/schemas.ts) and [`packages/types/src/index.ts`](packages/types/src/index.ts) — list-only entry type: `Standup` plus `blockers: Blocker[]`. Do not add `blockers` onto entity `standupSchema` (that type is aligned with the standup row in [`backend/src/db/type-alignment.ts`](backend/src/db/type-alignment.ts)).
- [`app/src/lib/api/client.ts`](app/src/lib/api/client.ts) — parse the richer list schema; keep `credentials: "include"`; do not store login/register tokens.
- [`app/src/lib/workspace/member-session.ts`](app/src/lib/workspace/member-session.ts) (new) — origin + session probe, one-shot Atlas create, UUID selection.
- [`app/src/lib/time/standup-window.ts`](app/src/lib/time/standup-window.ts) — workspace-local today and UTC-Monday `weekStart` using existing `isMondayUtc` / `weekStartSchema` from `@pulseboard/types`.
- Workspace floors: [`app/src/routes/[workspace]/+layout.svelte`](app/src/routes/[workspace]/+layout.svelte), [`dashboard/+page.svelte`](app/src/routes/[workspace]/dashboard/+page.svelte), [`standup/+page.svelte`](app/src/routes/[workspace]/standup/+page.svelte), [`history/+page.svelte`](app/src/routes/[workspace]/history/+page.svelte), [`lead/summary/+page.svelte`](app/src/routes/[workspace]/lead/summary/+page.svelte).
- [`app/src/routes/auth/login/+page.svelte`](app/src/routes/auth/login/+page.svelte) — lede still describes the real cookie flags (`SameSite=None; Secure; HttpOnly`).
- [`app/src/lib/styles/global.css`](app/src/lib/styles/global.css) — status switcher for live blocker PATCH, empty digest, using existing token pipeline (`--pb-*`), not new card chrome.
- Tests: [`app/test/api-client.test.ts`](app/test/api-client.test.ts), new [`app/test/member-session.test.ts`](app/test/member-session.test.ts), [`app/test/static-routes.test.ts`](app/test/static-routes.test.ts); [`app/package.json`](app/package.json) `test` script lists the new file.
- [`.env.example`](.env.example) — comment the CORS origin names already read by `allowedOrigins` (no values, not `requiredEnvNames`).

Do not edit [`app/svelte.config.js`](app/svelte.config.js), [`backend/src/db/migrate.ts`](backend/src/db/migrate.ts), [`backend/src/scheduler/cron.ts`](backend/src/scheduler/cron.ts), or add `migrate()` / `createSchedulerPort` to `main()`.

## Implementation steps

What makes this distinctive: the URL slug `atlas` stays a **static floor name**, not a resource id. Prerender paints the editorial catalog; the browser swaps in live rows only after `GET /api/v1/workspaces` succeeds. The preview UUID is a fixture, never a default query param. Digest remains a **stored artifact** (404 → empty UI). Session is the API cookie only.

### 1. Cross-origin session cookie

In [`CookiePolicy`](backend/src/auth/cookies.ts), set `sameSite` to `"None"` (string emitted as `SameSite=None`). Keep `secure: true`, `HttpOnly`, `Path=/`, `Max-Age` from `DEFAULT_TOKEN_TTL_SECONDS` usage (15 minutes in `defaultCookiePolicy`). [`serializeSessionCookie`](backend/src/auth/cookies.ts) already appends `Secure` when `policy.secure`. [`createApp`](backend/src/http/app.ts) and [`main()`](backend/src/index.ts) already pass `defaultCookiePolicy`. [`createHarness`](backend/src/testing/harness.ts) may keep `secure: false` for in-process dispatch; still expect `SameSite=None` and `HttpOnly` on register/login `set-cookie`.

Update [`register()`](backend/src/routes/contracts.test.ts) from `/SameSite=Lax/` to `/SameSite=None/`.

### 2. GET `/standups` carries persisted blockers (no new route)

`Standup` on the wire has `rawBlockers` only; PATCH [`updateBlockerStatus`](app/src/lib/api/client.ts) needs `Blocker.id`. [`listBlockersForStandup`](backend/src/store/port.ts) already exists; contract tests today read ids from the **store**, not HTTP.

- Add `standupListEntrySchema`: intersection of `standupSchema` with `{ blockers: z.array(blockerSchema) }` (required on list entries).
- Point `standupListSchema` at `z.array(standupListEntrySchema)` **or** keep `standupListSchema` as `Standup[]` and introduce `standupBoardListSchema` used only by GET `/standups` and `ApiClient.listStandups`. Prefer one list schema used by both handler and client so they cannot drift.
- In [`registerStandupRoutes`](backend/src/routes/standups.ts) GET handler: after `listStandups`, map each standup through `listBlockersForStandup`, then parse with the new schema.
- Extend the GET standups case in [`contracts.test.ts`](backend/src/routes/contracts.test.ts) (the `range=2026-08-17/2026-08-18` example around the existing list assertion) to require `blockers[0].id` / `status` for a standup that named a blocker.
- `ApiClient.listStandups` return type includes `blockers`. History UI can ignore `blockers` and keep using `rawBlockers`.

Do not add `GET /blockers`. Do not put `blockers` on entity `Standup`.

### 3. Member workspace resolver (browser-only)

New [`app/src/lib/workspace/member-session.ts`](app/src/lib/workspace/member-session.ts):

- Inputs: `ApiClient` (from `createApiClient(env.PUBLIC_API_ORIGIN)` — unset origin already yields `UnconfiguredClient` / `MissingApiOriginError`).
- Export `PREVIEW_WORKSPACE_ID` as a named constant equal to `ATLAS_WORKSPACE.id` for tests, or import `ATLAS_WORKSPACE` and compare by value.
- Module-level in-flight `Promise` so cover, dashboard, standup, history, and lead cannot POST four workspaces.
- Algorithm:
  1. `listWorkspaces()`.
  2. If `ApiProblemError.problem.status` is `401` (or `403`), treat as **no session**: throw a dedicated result or return `{ kind: "anonymous" }` — callers must **not** swap fixtures.
  3. If `200` and `length === 0`: `createWorkspace({ name: "Atlas", timezone: "America/New_York" })` once (`ATLAS_WORKSPACE.name` / `timezone`, **not** `ATLAS_WORKSPACE.id`). Use `{ id, name, timezone }` from `CreateWorkspaceResponse`.
  4. If `200` and non-empty: pick the first row with `name === "Atlas"` if present; otherwise the first list row. Never send the preview catalog UUID unless it is that member’s `id`.
  5. `MissingApiOriginError` and other failures: `{ kind: "anonymous" }` — keep fixtures. Do not cache an anonymous result across a later login; do cache a successful member workspace so floors cannot create twice.

### 4. Workspace-local today and UTC Monday `weekStart`

In [`standup-window.ts`](app/src/lib/time/standup-window.ts), add helpers for:

- workspace-local `YYYY-MM-DD` (existing `date-fns-tz` path used by `workspaceClock`);
- inclusive standup `range` strings `YYYY-MM-DD/YYYY-MM-DD`;
- UTC-Monday `weekStart` for digest GET, validated with `isMondayUtc` / `weekStartSchema`.

Dashboard hydrates standups in a window ending on workspace-local today. History uses the filter bar’s from/to as that range. Lead digest uses the UTC Monday of “now” in the browser after session resolve — never `PREVIEW_DIGEST.weekStart` as a live query default.

### 5. Floor hydration (prerender fixtures, browser swap)

Keep `prerender = true` and layout `load()` on the preview catalog. In the browser (`onMount` / client `$effect` gated on mount), if `PUBLIC_API_ORIGIN` is set, `resolveMemberWorkspace`. Until `{ kind: "member" }`, leave editorial standups, blockers, and digest in place.

- **Layout rail:** live `Date` and member timezone when signed in; otherwise `PREVIEW_NOW` and catalog timezone.
- **Dashboard:** `GET /standups?workspaceId=&range=`; flatten `blockers` for the ledger; PATCH via existing `updateBlockerStatus` (`OPEN` / `RESOLVED` / `FLAGGED`) using list `Blocker.id`. Preview ledger stays static labels.
- **Standup:** `createStandup` with the member UUID, not the catalog id.
- **History:** `GET /standups` with the date inputs; ignore `blockers` and keep `rawBlockers` for CLEAR/BLOCKED.
- **Lead:** `GET /digest/weekly?workspaceId=&weekStart=`. Store-only: 404 or empty → empty UI. Do not compile in-process or construct `createSchedulerPort` in `main()`.

### 6. Cookie copy and CORS names

Login lede describes `SameSite=None; Secure; HttpOnly`. `.env.example` comments `CORS_ORIGIN` / `ALLOWED_ORIGINS` / `FRONTEND_URL` / `APP_URL` (no values; not `requiredEnvNames`). Host must set at least one to the static app origin (comma-separated, no trailing slash).

### 7. Tests

- Cookie `SameSite=None` on register.
- GET standups JSON includes `blockers[0].id` / `status`.
- `ApiClient.listStandups` parses the richer list; still `credentials: "include"`; login/register still do not persist `token`.
- Member session: 401/403 stay anonymous (no POST); empty list POSTs Atlas once under concurrency; named Atlas row wins; preview UUID is not used unless it is the member’s row.
- Static routes: login lede flags; adapter-static unchanged.

## Validation and acceptance

From the repository root (authoritative; no database required):

```sh
npm install
npm run lint
npm run typecheck
npm run test
npm run build
```

Do not connect to PostgreSQL, run migrations inside the API process, or hit a live origin during these checks.

**Acceptance**

- `/atlas` URLs remain prerendered floor names. Anonymous visitors keep editorial fixtures.
- Signed-in member with `PUBLIC_API_ORIGIN` uses a live workspace UUID from `GET /workspaces` (creating Atlas once if the list is empty).
- Dashboard, history, standup create, lead digest, and blocker PATCH talk to `/api/v1` with `credentials: include`.
- Session cookie is `SameSite=None; Secure; HttpOnly`. Digest GET is store-only (404 → empty UI).
- `AuthTokenResponse.token` is not persisted. Schema is applied by the host via `npm run db:migrate` in `@pulseboard/backend`.

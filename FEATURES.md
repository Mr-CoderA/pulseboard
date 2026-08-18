# Features

Pulseboard is a zone-aware standup tracker. This repository is a TypeScript monorepo with two deployment artifacts that share compile-time and runtime contracts.

## Product

- **Standup tracking.** Canonical API paths cover daily standups, blocker status, and a weekly digest. Zod schemas reject malformed payloads at the HTTPS boundary before store adapters run.
- **Workspaces.** List and create workspaces. Workspace `timezone` values must be valid IANA identifiers; weekly digest `weekStart` must be a Monday. Standup `date` is the workspace-local calendar day (`date-fns-tz`), not UTC.
- **Credential auth.** `POST /api/v1/auth/register` and `POST /api/v1/auth/login` issue short-lived HMAC JWTs signed with `BETTER_AUTH_SECRET`. Every authenticated caller is a `member`. Sessions travel as `Authorization: Bearer` or an HTTP-only `SameSite=Lax` cookie (`pulseboard_session`) and are refreshed near expiry. No third-party OAuth.
- **Static UI.** `@pulseboard/app` is a prerendered SvelteKit site (adapter-static, `prerender = true`). Routes cover `/auth/login`, `/auth/register`, and `/:workspace/{dashboard,standup,history,lead/summary}`. Theming is a CSS custom-property pipeline (Inter + IBM Plex Mono, 8px scale, `#2563eb` accent). Workspace pages prerender the Atlas preview fixtures; the API client requires `PUBLIC_API_ORIGIN` at runtime and has no local fallback.
- **Stateless API binary.** `@pulseboard/backend` compiles to a Node 20 ESM bundle. Handlers run against a store port; unit tests inject an in-memory adapter. The entrypoint advertises its process contract and does not bind a listen port, open PostgreSQL, or call a scheduler.
- **Relational schema.** Drizzle tables, checks, unique indexes, and foreign keys model users, workspaces, membership, standups, blockers, and weekly digests. Build-time validation compares the live schema to a generated catalog and to shared Zod entity types.

## Architecture

| Path | Package | Artifact |
|------|---------|----------|
| `app/` | `@pulseboard/app` | Static site in `app/build` (Cloudflare Pages) |
| `backend/` | `@pulseboard/backend` | Single ESM file `backend/dist/index.js` (Fly.io, `--target=node20`) |
| `packages/types/` | `@pulseboard/types` | Shared Zod payloads, path map, env-name constants, RFC 7807 `ProblemDetails` |

Root tooling: npm workspaces, Turborepo (`turbo.json`), Biome (`biome.json`), solution-style TypeScript (`tsconfig.json` references `packages/types`, `backend`, `app/tsconfig.app.json`, `app/tsconfig.node.json`). Shared compiler defaults live in `tsconfig.base.json`.

`@pulseboard/app` and `@pulseboard/backend` both depend on `@pulseboard/types`. The app Vite config marks that package `ssr.noExternal`. The backend bundles it with esbuild. Types are ESM (`"type": "module"`) with `exports` pointing at `dist`. Persistence types are inferred from Drizzle and regenerated into `backend/src/db/generated/`.

There is no Docker Compose file. PostgreSQL and the scheduler are external services.

## API contract (`@pulseboard/types` + `@pulseboard/backend`)

Prefix: `/api/v1`. Handlers live in `backend/src/routes`. Payloads are parsed with the shared Zod maps; errors are RFC 7807 Problem Details (`application/problem+json`).

| Method | Path | Success |
|------|------|---------|
| `POST` | `/api/v1/auth/register` | 201 `{ token }` |
| `POST` | `/api/v1/auth/login` | 200 `{ token }` |
| `GET` | `/api/v1/workspaces` | 200 `[Workspace]` |
| `POST` | `/api/v1/workspaces` | 201 `{ id, name, timezone }` |
| `POST` | `/api/v1/standups` | 201 `{ id, submittedAt }` |
| `GET` | `/api/v1/standups?workspaceId=&range=` | 200 `[Standup]` |
| `PATCH` | `/api/v1/blockers/:id/status` | 200 `{ status }` |
| `GET` | `/api/v1/digest/weekly?workspaceId=&weekStart=` | 200 `{ velocityScore, unresolvedBlockerCount, compiledMd }` |

Authenticated routes accept `Authorization: Bearer <token>` or the session cookie. Rate limiting is expected at the edge (sliding window), not in this process.

## External services

Names only; values come from the host. Recorded in `.env.example` and `ENV_NAMES`:

- `DATABASE_URL` — PostgreSQL; connections must use `sslmode=require`
- `SCHEDULER_ENDPOINT` / `SCHEDULER_KEY` — external cron/queue (digest compilation, prompt delivery)
- `BETTER_AUTH_SECRET` — HMAC material for session JWTs
- `PUBLIC_API_ORIGIN` — HTTPS origin of the API, read by the static app (no default)

`drizzle-kit generate` / `drizzle-kit check`, schema validation, and unit tests never read these values (tests inject a store and a token secret). They never connect.

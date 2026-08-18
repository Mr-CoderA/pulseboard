# Features

Pulseboard is a zone-aware standup tracker. This repository is a TypeScript monorepo with two deployment artifacts that share compile-time and runtime contracts.

## Product

- **Standup tracking.** Canonical API paths cover daily standups, blocker status, and a weekly digest. Zod schemas reject malformed payloads at the HTTPS boundary.
- **Workspaces.** Paths exist for listing and creating workspaces. Workspace `timezone` values must be valid IANA identifiers; weekly digest `weekStart` must be a Monday.
- **Credential auth.** Register and login paths are reserved under `/api/v1/auth`. Session signing is expected via `BETTER_AUTH_SECRET` at deploy time. No auth library is wired in source.
- **Static UI.** `@pulseboard/app` is a prerendered SvelteKit site (adapter-static, `prerender = true`). The current page surfaces the shared API prefix and required environment variable names only.
- **Stateless API binary.** `@pulseboard/backend` compiles to a Node 20 ESM bundle. The entrypoint advertises its process contract (including table names) and does not bind a server, open PostgreSQL, or call a scheduler.
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

## API contract (`@pulseboard/types`)

Prefix: `/api/v1`.

| Path | Role |
|------|------|
| `/api/v1/auth/register` | Registration |
| `/api/v1/auth/login` | Login |
| `/api/v1/workspaces` | Workspace collection |
| `/api/v1/standups` | Standup collection |
| `/api/v1/blockers/:id/status` | Blocker status (`blockerStatusPath`) |
| `/api/v1/digest/weekly` | Weekly digest |

These are path constants plus Zod request/response schemas, not live handlers. Error responses are typed as RFC 7807 Problem Details (`type`, `title`, `status`, optional `detail` / `instance`).

## External services

Names only; values come from the host. Recorded in `.env.example` and `ENV_NAMES`:

- `DATABASE_URL` — PostgreSQL; connections must use `sslmode=require`
- `SCHEDULER_ENDPOINT` / `SCHEDULER_KEY` — external cron/queue (digest compilation, prompt delivery)
- `BETTER_AUTH_SECRET` — session signing material

`drizzle-kit generate` / `drizzle-kit check` and `backend` schema validation never read these values and never connect.

# Features

Pulseboard is a zone-aware standup tracker. This repository is a TypeScript monorepo with two deployment artifacts that share compile-time contracts.

## Product

- **Standup tracking.** Canonical API paths cover daily standups, blocker status, and a weekly digest.
- **Workspaces.** Paths exist for listing and creating workspaces; timezone handling is part of the product intent, not yet implemented in runtime code.
- **Credential auth.** Register and login paths are reserved under `/api/v1/auth`. Session signing is expected via `BETTER_AUTH_SECRET` at deploy time. No auth library is wired in source.
- **Static UI.** `@pulseboard/app` is a prerendered SvelteKit site (adapter-static, `prerender = true`). The current page surfaces the shared API prefix and required environment variable names only.
- **Stateless API binary.** `@pulseboard/backend` compiles to a Node 20 ESM bundle. The entrypoint advertises its process contract and does not bind a server, open PostgreSQL, or call a scheduler.

## Architecture

| Path | Package | Artifact |
|------|---------|----------|
| `app/` | `@pulseboard/app` | Static site in `app/build` (Cloudflare Pages) |
| `backend/` | `@pulseboard/backend` | Single ESM file `backend/dist/index.js` (Fly.io, `--target=node20`) |
| `packages/types/` | `@pulseboard/types` | Shared path map, env-name constants, RFC 7807 `ProblemDetails` type |

Root tooling: npm workspaces, Turborepo (`turbo.json`), Biome (`biome.json`), solution-style TypeScript (`tsconfig.json` references `packages/types`, `backend`, `app/tsconfig.app.json`, `app/tsconfig.node.json`). Shared compiler defaults live in `tsconfig.base.json`.

`@pulseboard/app` and `@pulseboard/backend` both depend on `@pulseboard/types`. The app Vite config marks that package `ssr.noExternal`. The backend bundles it with esbuild. Types are ESM (`"type": "module"`) with `exports` pointing at `dist`.

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

These are path constants, not live handlers. Error responses are typed as RFC 7807 Problem Details (`type`, `title`, `status`, optional `detail` / `instance`). Runtime payload validation is not in the tree.

## External services

Names only; values come from the host. Recorded in `.env.example` and `ENV_NAMES`:

- `DATABASE_URL` — PostgreSQL; connections must use `sslmode=require`
- `SCHEDULER_ENDPOINT` / `SCHEDULER_KEY` — external cron/queue (digest compilation, prompt delivery)
- `BETTER_AUTH_SECRET` — session signing material

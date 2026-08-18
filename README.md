# pulseboard
[repofixer:6a83ef97beae51a419c6049e:app]

Zone-aware standup tracking as a TypeScript monorepo. The `app` package is a fully static SvelteKit build for Cloudflare Pages. The `backend` package compiles to a Node 20 binary for Fly.io. Both consume shared contracts from `@pulseboard/types`.

## Packages

| Path | Name | Role |
|------|------|------|
| `app/` | `@pulseboard/app` | Static SvelteKit UI (Cloudflare Pages) |
| `backend/` | `@pulseboard/backend` | Node 20 API bundle (Fly.io) |
| `packages/types/` | `@pulseboard/types` | Shared Zod payloads, path map, env names, RFC 7807 |

Tooling lives at the repository root: Turborepo (`turbo.json`), Biome (`biome.json`), and a solution-style TypeScript project (`tsconfig.json` + `tsconfig.base.json`).

## TypeScript project references

`tsc -b` at the repository root walks this graph:

```
packages/types  ←  backend
                ←  app/tsconfig.app.json
                   app/tsconfig.node.json
```

Each package emits declarations (`composite` + `declaration`). The API runtime JavaScript is produced by esbuild (`--target=node20`) so the Fly.io artifact stays a single ESM file. The app's `.ts` boundary is type-checked through project references; Svelte files are checked with `svelte-check`.

## Commands

```sh
npm install
npm run build      # turbo pipeline, then tsc -b
npm run typecheck  # project references + per-package checks
npm run test       # backend contract tests + app static-route assertions
npm run lint       # biome check .
```

Backend `build` also regenerates persistence catalogs, runs `drizzle-kit generate` / `drizzle-kit check`, executes credential-free Zod/schema alignment checks, and runs unit tests against in-memory store adapters. Node 20 or newer is required (`engines.node` and `.nvmrc`).

## Environment

Credentials are injected at deploy time. Copy `.env.example` locally if needed; `.env` and `.env.*` are gitignored and must never be committed.

| Name | Purpose |
|------|---------|
| `DATABASE_URL` | Externally managed PostgreSQL. Use `sslmode=require`. |
| `SCHEDULER_ENDPOINT` | External cron/queue provider (digest compilation, prompts). |
| `SCHEDULER_KEY` | Auth material for the scheduler provider. |
| `BETTER_AUTH_SECRET` | Session signing for better-auth. |
| `PUBLIC_API_ORIGIN` | HTTPS origin of the API, used by the static app. No local fallback. |

Schema generation and validation do not read these values and never open a connection. `DATABASE_URL` is required only when a runtime adapter issues a query. This repository does not run a local database, cache, or queue. There is no Docker Compose file; stateful services are provisioned outside the repo.

## Relational model

PostgreSQL tables are declared in `backend/src/db/schema.ts` (Drizzle) and mirrored by HTTPS Zod contracts in `packages/types/src/schemas.ts`:

- `users`
- `workspaces`
- `workspace_members`
- `standups`
- `blockers` (`blocker_status`: OPEN / RESOLVED / FLAGGED)
- `weekly_digests`

SQL migrations live in `backend/src/db/migrations/` and are generated, not applied, during build.

## Milestone boundary

This commit adds the static SvelteKit UI: page components, a CSS custom-property theme pipeline, prerendered routes (including `/atlas/*` workspace desks), and Node tests that assert those routes and tokens. The API remains the existing `/api/v1` handlers; the browser client does not call a live origin at build time.

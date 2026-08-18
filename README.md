# pulseboard
[repofixer:6a83ef97beae51a419c6049e:app]

Zone-aware standup tracking as a TypeScript monorepo. The `app` package is a fully static SvelteKit build for Cloudflare Pages. The `backend` package compiles to a Node 20 binary for Fly.io. Both consume shared contracts from `@pulseboard/types`.

## Packages

| Path | Name | Role |
|------|------|------|
| `app/` | `@pulseboard/app` | Static SvelteKit UI (Cloudflare Pages) |
| `backend/` | `@pulseboard/backend` | Node 20 API bundle (Fly.io) |
| `packages/types/` | `@pulseboard/types` | Shared path, env-name, and RFC 7807 contracts |

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
npm run lint       # biome check .
```

Node 20 or newer is required (`engines.node` and `.nvmrc`).

## Environment

Credentials are injected at deploy time. Copy `.env.example` locally if needed; `.env` and `.env.*` are gitignored and must never be committed.

| Name | Purpose |
|------|---------|
| `DATABASE_URL` | Externally managed PostgreSQL. Use `sslmode=require`. |
| `SCHEDULER_ENDPOINT` | External cron/queue provider (digest compilation, prompts). |
| `SCHEDULER_KEY` | Auth material for the scheduler provider. |
| `BETTER_AUTH_SECRET` | Session signing for better-auth. |

This repository does not run a local database, cache, or queue. There is no Docker Compose file; stateful services are provisioned outside the repo.

## Milestone boundary

This commit establishes the workspace, shared lint/packaging config, and the TypeScript reference graph. Relational schemas, API route handlers, and the SvelteKit page/design system land in later milestones.

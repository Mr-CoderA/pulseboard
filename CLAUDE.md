# Repository guidance

Private npm workspace (`pulseboard`). Node `>=20` (`.nvmrc`: `20`). Package manager: npm (`packageManager` / `devEngines` in the root `package.json`).

## Layout

- `app/` — static SvelteKit UI (`@pulseboard/app`)
- `backend/` — Node 20 API compile target (`@pulseboard/backend`)
- `packages/types/` — shared contracts (`@pulseboard/types`)
- Root: `turbo.json`, `biome.json`, `tsconfig.json`, `tsconfig.base.json`

Keep shared paths, env **names**, and Problem Details types in `@pulseboard/types`. App and backend consume that package; do not duplicate the contract. Use TypeScript project references (`tsc -b`) rather than ad-hoc path aliases between packages.

All packages are ESM (`"type": "module"`). Types-package relative imports use `.js` specifiers.

## Commands

Run from the repository root:

```sh
npm install
npm run build      # turbo run build && tsc -b
npm run typecheck  # tsc -b && per-package typecheck (svelte-check in app)
npm run lint       # biome check .
npm run format     # biome check --write .
npm run clean
```

Turbo `build` is `dependsOn: ["^build"]`, so `@pulseboard/types` emits before app and backend. App build is `vite build` (adapter-static → `app/build`). Backend build is `tsc -b` (declarations) then esbuild (`--platform=node --target=node20 --format=esm`).

Do not add Docker/Compose for Postgres, caches, or queues. Do not add fake binaries, shims, or script/env overrides to make checks pass.

## Validation

Authoritative install/build: `npm install && npm run build` from `.`. It must succeed without credentials or a running database.

Allowed checks: dependency install, Biome, `tsc -b` / `svelte-check`, unit tests with mocks, static config validation. Do not connect to PostgreSQL, the scheduler, or any other live service during build or tests. Do not run migrations, OAuth, webhooks, payments, or email.

`engine-strict=true` in `.npmrc`. Generated output (`dist`, `build`, `.svelte-kit`, `.tsbuild`, `.turbo`, `node_modules`) is gitignored.

## Security

- List required variable **names** in `.env.example` and `ENV_NAMES`. Never commit values. `.gitignore` ignores `.env` and `.env.*` except `.env.example`.
- Do not invent fallback credentials, default secrets, or local service URLs in source.
- Do not read `DATABASE_URL`, `SCHEDULER_KEY`, or `BETTER_AUTH_SECRET` into runtime defaults. The backend entrypoint prints names only and must not open a database or scheduler connection.
- PostgreSQL must use `sslmode=require` when a connection is added.
- Do not bake secrets into build artifacts. `BETTER_AUTH_SECRET` is deploy-time signing material, not a committed key.

## Privacy

No user datastore or request log pipeline exists yet. When handlers land:

- Do not log tokens, passwords, `DATABASE_URL`, `SCHEDULER_KEY`, or `BETTER_AUTH_SECRET`.
- Treat standup text, emails, and workspace identifiers as user data; keep them out of stack traces and client error payloads beyond the RFC 7807 fields already typed.
- Do not add third-party analytics or telemetry without an explicit product requirement.

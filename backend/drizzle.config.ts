import { defineConfig } from "drizzle-kit";

/**
 * Credential-free kit config. `generate` and `check` diff TypeScript schema
 * against committed snapshots; they never open PostgreSQL.
 * Live migrate/push/studio require DATABASE_URL at deploy/ops time only.
 */
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  strict: true,
  verbose: true,
  breakpoints: true,
});

import { migrate } from "drizzle-orm/postgres-js/migrator";
import { closeDatabase, getDatabase } from "./client.js";

async function main(): Promise<void> {
  await migrate(getDatabase(), { migrationsFolder: "./src/db/migrations" });
}

void main()
  .then(async () => {
    await closeDatabase();
    console.log("database migrations applied");
  })
  .catch(async (error: unknown) => {
    await closeDatabase().catch(() => undefined);
    console.error(
      "database migration failed:",
      error instanceof Error ? error.message : "unknown error",
    );
    process.exitCode = 1;
  });

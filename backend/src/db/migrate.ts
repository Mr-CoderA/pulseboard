import { migrate } from "drizzle-orm/postgres-js/migrator";
import { closeDatabase, getDatabase } from "./client.js";

async function main(): Promise<void> {
  await migrate(getDatabase(), { migrationsFolder: "./src/db/migrations" });
}

void main()
  .then(async () => {
    await closeDatabase();
    process.stdout.write("database migrations applied
");
  })
  .catch(async (error: unknown) => {
    await closeDatabase().catch(() => undefined);
    process.stderr.write(
      "database migration failed: " +
        (error instanceof Error ? error.message : "unknown error") +
        "
",
    );
    process.exitCode = 1;
  });

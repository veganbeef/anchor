import { promises as fs } from "node:fs";
import path from "node:path";
import { Migrator, FileMigrationProvider } from "kysely";

import { db } from "./index";

async function migrate() {
  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder: path.join(__dirname, "migrations"),
    }),
  });

  const { error, results } = await migrator.migrateToLatest();

  if (results) {
    for (const result of results) {
      if (result.status === "Success") {
        console.log(
          `Migration "${result.migrationName}" was executed successfully`,
        );
      } else if (result.status === "Error") {
        console.error(`Failed to execute migration "${result.migrationName}"`);
      }
    }
  }

  if (error) {
    console.error("Failed to run migrations");
    console.error(error);
    process.exit(1);
  }

  await db.destroy();
}

migrate();

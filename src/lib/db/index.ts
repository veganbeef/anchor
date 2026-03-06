/**
 * Kysely database client with automatic dialect switching.
 *
 * - **Production**: Neon serverless driver (DATABASE_URL contains "neon.tech").
 * - **Local dev**: node-postgres Pool targeting Docker PostgreSQL.
 *
 * `@neondatabase/serverless` is loaded via dynamic `require` so it stays out
 * of the client bundle when running locally.
 */
import { Kysely, PostgresDialect } from "kysely";
import { NeonDialect, type NeonDialectConfig } from "kysely-neon";
import { Pool } from "pg";

import type { DB } from "./types";

function createDialect(): PostgresDialect | NeonDialect {
  const url = process.env.DATABASE_URL;

  if (!url) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  if (url.includes("neon.tech")) {
    // Production: use Neon serverless driver.
    // @neondatabase/serverless is a peer dependency of kysely-neon and must
    // be installed separately. The dynamic require keeps it out of the
    // client bundle when running locally with node-postgres.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { neon } = require("@neondatabase/serverless") as {
      neon: (connectionString: string) => NeonDialectConfig["neon"];
    };

    return new NeonDialect({
      neon: neon(url),
    });
  }

  // Local development: use node-postgres Pool
  return new PostgresDialect({
    pool: new Pool({ connectionString: url }),
  });
}

export const db = new Kysely<DB>({
  dialect: createDialect(),
});

export type { DB } from "./types";

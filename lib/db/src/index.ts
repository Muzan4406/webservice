import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.PG_URL) {
  console.warn(
    "[db] PG_URL is not set — the server will start but all database queries will fail. " +
    "Set PG_URL in your environment variables to connect to PostgreSQL.",
  );
}

export const pool = new Pool({ connectionString: process.env.PG_URL });
export const db = drizzle(pool, { schema });

export * from "./schema";

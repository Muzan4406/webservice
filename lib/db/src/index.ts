import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.PG_URL) {
  throw new Error(
    "PG_URL must be set. Add your Supabase connection string as PG_URL secret.",
  );
}

export const pool = new Pool({ connectionString: process.env.PG_URL });
export const db = drizzle(pool, { schema });

export * from "./schema";

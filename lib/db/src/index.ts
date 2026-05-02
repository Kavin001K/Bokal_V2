import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
export const db = drizzle(pool, { schema });

// Auto-migrate newly added columns for user profiles
pool.query(`
  ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number text;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth text;
`).catch((err) => {
  console.error("Failed to run auto-migrations:", err);
});

export * from "./schema";

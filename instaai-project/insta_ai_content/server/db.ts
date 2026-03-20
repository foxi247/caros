import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../drizzle/schema";

// Supabase / PostgreSQL connection
const client = postgres(process.env.DATABASE_URL!, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
  // Required for Supabase connection pooling (Transaction mode on port 6543)
  prepare: false,
});

export const db = drizzle(client, { schema });

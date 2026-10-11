import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { getEnv } from "@/config/env.js";
import * as schema from "./schema/index.js";

let db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (!db) {
    const { DATABASE_URL } = getEnv();
    // Supabase transaction pooler (:6543) multiplexes clients and does not support
    // prepared statements; keep few connections per instance on hosted deploys.
    const pooled = /:6543\//.test(DATABASE_URL);
    const client = postgres(DATABASE_URL, { max: pooled ? 3 : 10, prepare: !pooled });
    db = drizzle(client, { schema });
  }
  return db;
}

export type Db = ReturnType<typeof getDb>;
export type Transaction = Parameters<Parameters<Db["transaction"]>[0]>[0];
export type QueryDb = Db | Transaction;

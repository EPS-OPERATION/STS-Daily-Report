import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { getEnv } from "@/config/env.js";
import * as schema from "./schema/index.js";

let db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (!db) {
    const { DATABASE_URL } = getEnv();
    const client = postgres(DATABASE_URL, { max: 10 });
    db = drizzle(client, { schema });
  }
  return db;
}

export type Db = ReturnType<typeof getDb>;

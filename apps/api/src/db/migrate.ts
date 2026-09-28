import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { getEnv } from "@/config/env.js";

const { DATABASE_URL } = getEnv();
const client = postgres(DATABASE_URL, { max: 1 });
const db = drizzle(client);

await migrate(db, { migrationsFolder: "./src/db/migrations" });
console.log("migrations applied");
await client.end();

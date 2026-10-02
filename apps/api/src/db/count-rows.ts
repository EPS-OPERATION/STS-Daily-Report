import postgres from "postgres";
import { getEnv } from "@/config/env.js";

const { DATABASE_URL } = getEnv();
const sql = postgres(DATABASE_URL);

try {
  const [p] = await sql`select count(*) from projects`;
  const [c] = await sql`select count(*) from contractors`;
  const [b] = await sql`select count(*) from buildings`;
  const [d] = await sql`select count(*) from daily_reports`;
  console.log("PROJECTS:", p.count);
  console.log("CONTRACTORS:", c.count);
  console.log("BUILDINGS:", b.count);
  console.log("DAILY_REPORTS:", d.count);
  process.exit(0);
} catch (err: any) {
  console.error(err);
  process.exit(1);
}

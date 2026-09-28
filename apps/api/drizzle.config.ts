import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema/index.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    // drizzle-kit reads from env; bun loads .env automatically.
    url: process.env["DATABASE_URL"] ?? "postgresql://postgres:postgres@localhost:5432/sts",
  },
});

import { getEnv } from "@/config/env.js";
import { buildApp } from "./app.js";

const env = getEnv();
const app = buildApp();

app.listen(env.API_PORT, () => {
  console.log(`api listening on http://localhost:${env.API_PORT}`);
});

export type { App } from "./app.js";

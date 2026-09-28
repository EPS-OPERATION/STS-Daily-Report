import { z } from "zod";

const schema = z.object({
  VITE_API_URL: z.string().default("http://localhost:3000/api/v1"),
});

const parsed = schema.safeParse({
  VITE_API_URL: import.meta.env["VITE_API_URL"],
});

if (!parsed.success) {
  console.error("Invalid web env", parsed.error.flatten().fieldErrors);
}

export const config = {
  apiUrl: parsed.success ? parsed.data.VITE_API_URL : "http://localhost:3000/api/v1",
};

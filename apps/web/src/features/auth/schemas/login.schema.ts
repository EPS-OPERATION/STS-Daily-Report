import { z } from "zod";

export const loginFormSchema = z.object({
  identifier: z.string().trim().toLowerCase().min(1, "Enter your email or username").max(320),
  password: z.string().min(1, "Enter your password").max(128),
});

export type LoginFormValues = z.infer<typeof loginFormSchema>;

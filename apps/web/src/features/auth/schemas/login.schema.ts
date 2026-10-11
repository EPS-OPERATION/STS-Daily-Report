import { z } from "zod";

export const loginFormSchema = z.object({
  identifier: z.string().trim().toLowerCase().min(1, "Enter your email or username").max(320),
  password: z.string().min(1, "Enter your password").max(128),
});
export const demoFormSchema = z.object({
  identifier: z.string().trim().toLowerCase().email("Enter a valid email address").max(320),
  password: z.string().optional(),
  accessCode: z.string().max(200).optional(),
});

export type LoginFormValues = z.infer<typeof loginFormSchema>;

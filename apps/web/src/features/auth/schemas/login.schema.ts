import { z } from "zod";

export const loginFormSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address").max(320),
});

export type LoginFormValues = z.infer<typeof loginFormSchema>;

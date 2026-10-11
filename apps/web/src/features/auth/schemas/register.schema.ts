import { checkPassword } from "@sts/shared";
import { z } from "zod";

// Mirrors PASSWORD_RULE_MESSAGE in @sts/shared — keep the checklist and this rule in sync.
const newPassword = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(128, "Use at most 128 characters")
  .refine((v) => checkPassword(v).valid, "Include at least 3 of: lowercase, uppercase, numbers, special characters");

export const newPasswordSchema = z.object({
  password: newPassword,
  confirmPassword: z.string().min(1, "Confirm your password"),
}).refine((v) => v.password === v.confirmPassword, { path: ["confirmPassword"], message: "Passwords do not match" });
export const registerFormSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address").max(320),
  username: z.string().trim().toLowerCase().regex(/^[a-z0-9._-]{3,20}$/, "Use 3–20 characters: a–z, 0–9, dot, underscore or hyphen"),
  password: newPassword,
  confirmPassword: z.string().min(1, "Confirm your password"),
  contractorChoice: z.string().min(1, "Choose your contractor"),
  companyName: z.string().trim().max(200),
}).superRefine((v, ctx) => {
  if (v.password !== v.confirmPassword) ctx.addIssue({ code: "custom", path: ["confirmPassword"], message: "Passwords do not match" });
  if (v.contractorChoice === "other" && !v.companyName) ctx.addIssue({ code: "custom", path: ["companyName"], message: "Enter your company name" });
});
export type RegisterFormValues = z.infer<typeof registerFormSchema>;
export type NewPasswordValues = z.infer<typeof newPasswordSchema>;

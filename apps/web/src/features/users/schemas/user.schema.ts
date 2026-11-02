import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH, USER_ROLES } from "@sts/shared";
import { z } from "zod";
export const rejectUserSchema = z.object({ reason: z.string().trim().min(1, "Enter a rejection reason").max(500) });
export const approveUserSchema = z.object({ contractorChoice: z.string().min(1, "Choose a contractor or keep the company unlinked") });
export const createUserSchema = z
  .object({
    displayName: z.string().trim().max(120),
    email: z.string().trim().email("Enter a valid email address"),
    username: z.string().trim().toLowerCase().regex(/^[a-z0-9._-]{3,20}$/, "3–20 characters: a–z, 0–9, dot, underscore or hyphen"),
    password: z.string().min(PASSWORD_MIN_LENGTH, `At least ${PASSWORD_MIN_LENGTH} characters`).max(PASSWORD_MAX_LENGTH),
    role: z.enum(USER_ROLES),
    contractorId: z.string().optional(),
  })
  .refine((v) => v.role !== "contractor" || Boolean(v.contractorId), { path: ["contractorId"], message: "Choose the contractor" });
export type CreateUserValues = z.infer<typeof createUserSchema>;

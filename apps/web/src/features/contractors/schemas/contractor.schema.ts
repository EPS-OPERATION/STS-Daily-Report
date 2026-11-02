import { z } from "zod";

export const contractorFormSchema = z.object({
  code: z.string().trim().min(1, "Code is required").max(32),
  name: z.string().trim().min(1, "Name is required").max(200),
  contactName: z.string().trim().max(120),
  contactPhone: z
    .string()
    .trim()
    .max(40)
    .regex(/^[0-9+\-() ]*$/, "ตัวเลข + - ( ) เท่านั้น"),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Pick a colour"),
  active: z.boolean(),
});

export type ContractorFormValues = z.infer<typeof contractorFormSchema>;

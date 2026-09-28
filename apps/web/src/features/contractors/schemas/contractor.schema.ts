import { z } from "zod";

export const contractorFormSchema = z.object({
  code: z.string().trim().min(1, "Code is required").max(32),
  name: z.string().trim().min(1, "Name is required").max(200),
});

export type ContractorFormValues = z.infer<typeof contractorFormSchema>;

import { z } from "zod";
export const rejectUserSchema = z.object({ reason: z.string().trim().min(1, "Enter a rejection reason").max(500) });
export const approveUserSchema = z.object({ contractorChoice: z.string().min(1, "Choose a contractor or keep the company unlinked") });

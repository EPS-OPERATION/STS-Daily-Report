import { ValidationError } from "@/shared/errors/app-error.js";

// Average daily headcount by position per contractor for the week (deck: "Headcount by Position").
// Averaged over the days each contractor actually reported, so a 3-day crew is not diluted.
export function assertRange(from: string, to: string) {
  const days = (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000;
  if (!(days >= 0 && days <= 62)) throw new ValidationError("Date range must be 0–62 days", { from, to });
}

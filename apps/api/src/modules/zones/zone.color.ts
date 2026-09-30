import { ValidationError } from "@/shared/errors/app-error.js";

export function normalizeZoneColor(value: unknown): string {
  if (typeof value !== "string" || !/^#[\da-fA-F]{6}$/.test(value.trim())) {
    throw new ValidationError("Zone color must be a six-digit hex value", { value });
  }
  return value.trim().toUpperCase();
}

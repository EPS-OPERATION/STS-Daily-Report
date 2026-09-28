export function toOffset(page: number, pageSize: number): number {
  return (page - 1) * pageSize;
}

export function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

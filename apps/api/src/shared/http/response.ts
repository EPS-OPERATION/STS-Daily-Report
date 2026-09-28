export function ok<T>(data: T): { data: T } {
  return { data };
}

export function paginated<T>(data: T[], page: number, pageSize: number, total: number) {
  return { data, meta: { page, pageSize, total } };
}

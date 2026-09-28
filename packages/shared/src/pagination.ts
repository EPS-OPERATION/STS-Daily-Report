export interface PaginationParams {
  page: number;
  pageSize: number;
  sort?: string;
  order?: "asc" | "desc";
  search?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: { page: number; pageSize: number; total: number };
}

export function normalizePagination(query: {
  page?: unknown;
  pageSize?: unknown;
  sort?: unknown;
  order?: unknown;
  search?: unknown;
}): PaginationParams {
  const page = Math.max(1, Number(query.page) || 1);
  const rawSize = Number(query.pageSize) || 20;
  const pageSize = Math.min(100, Math.max(1, rawSize));
  const order = query.order === "desc" ? "desc" : query.order === "asc" ? "asc" : undefined;
  const sort = typeof query.sort === "string" && query.sort.length > 0 ? query.sort : undefined;
  const search = typeof query.search === "string" && query.search.length > 0 ? query.search : undefined;
  return { page, pageSize, sort, order, search };
}

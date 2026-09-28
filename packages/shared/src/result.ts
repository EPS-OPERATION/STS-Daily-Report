export interface ApiErrorBody {
  error: { code: string; message: string; details?: unknown };
}

export interface ApiSingle<T> {
  data: T;
}

export interface ApiCollection<T> {
  data: T[];
  meta: { page: number; pageSize: number; total: number };
}

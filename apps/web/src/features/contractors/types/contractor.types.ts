export interface Contractor {
  id: string;
  code: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContractorListResponse {
  data: Contractor[];
  meta: { page: number; pageSize: number; total: number };
}

export interface ContractorFilters {
  page: number;
  pageSize: number;
  search?: string;
}

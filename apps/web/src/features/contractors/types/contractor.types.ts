export interface Contractor {
  id: string;
  code: string;
  name: string;
  /** false = the owner company (EPS). */
  isContractor: boolean;
  contactName: string | null;
  contactPhone: string | null;
  /** false = deactivated: hidden from sign-up, filters and new reports; its data stays. */
  active: boolean;
  /** Map colour in the requested project (null without a project). */
  color: string | null;
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
  projectId?: string;
}

export interface ContractorInput {
  code: string;
  name: string;
  contactName: string | null;
  contactPhone: string | null;
  projectId: string;
  color: string;
}

export interface ContractorUpdate extends Partial<ContractorInput> {
  active?: boolean;
}

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
  /** Left out = the API picks a free map colour. */
  color?: string;
}

export interface ContractorUpdate extends Partial<ContractorInput> {
  active?: boolean;
}

/** A login that belongs to (or asked for) a company — from GET /users?contractorId=. */
export interface CompanyUser {
  id: string;
  email: string;
  username: string | null;
  role: "contractor" | "eps_site" | "eps_admin";
  status: "pending" | "active" | "rejected" | "disabled";
  /** Active links in the project; 0 = asked for this company at sign-up, not linked yet. */
  membershipCount: number;
  createdAt: string;
}

export interface Contractor {
  id: string;
  code: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateContractorInput {
  code: string;
  name: string;
}

export interface UpdateContractorInput {
  code?: string;
  name?: string;
}

export interface ListContractorsQuery {
  page: number;
  pageSize: number;
  sort?: string;
  order?: "asc" | "desc";
  search?: string;
  projectId?: string;
  /** Leave out the owner company (EPS) — sign-up and pickers. */
  contractorsOnly?: boolean;
}

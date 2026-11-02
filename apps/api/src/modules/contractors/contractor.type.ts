export interface Contractor {
  id: string;
  code: string;
  name: string;
  isContractor: boolean;
  contactName: string | null;
  contactPhone: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateContractorInput {
  code: string;
  name: string;
  contactName?: string | null;
  contactPhone?: string | null;
  /** The company joins this project (sign-up, filters, map). */
  projectId: string;
  /** Map colour in that project; a free one is picked when left out. */
  color?: string;
}

export interface UpdateContractorInput {
  code?: string;
  name?: string;
  contactName?: string | null;
  contactPhone?: string | null;
  active?: boolean;
  /** With `color`: the project whose map colour changes. */
  projectId?: string;
  color?: string;
}

export interface ListContractorsQuery {
  page: number;
  pageSize: number;
  sort?: string;
  order?: "asc" | "desc";
  search?: string;
  projectId?: string;
  /** Leave out the owner company (EPS) and deactivated companies — sign-up and pickers. */
  contractorsOnly?: boolean;
}

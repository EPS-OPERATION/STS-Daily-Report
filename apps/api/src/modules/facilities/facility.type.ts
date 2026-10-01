export interface CreateFacilityInput {
  name: string;
  code?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}

export type UpdateFacilityInput = Partial<CreateFacilityInput>;
export type FacilityStatusFilter = "active" | "inactive" | "all";

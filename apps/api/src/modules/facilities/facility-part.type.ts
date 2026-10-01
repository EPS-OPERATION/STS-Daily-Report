export interface CreateFacilityPartInput {
  code: string;
  name: string;
  sortOrder?: number;
  isActive?: boolean;
}
export type UpdateFacilityPartInput = Partial<CreateFacilityPartInput>;

export type MapStatusFilter = "active" | "inactive" | "all";

export interface CreateSiteMapInput {
  name: string;
  description?: string | null;
  isDefault?: boolean;
  isActive?: boolean;
}
export type UpdateSiteMapInput = Partial<CreateSiteMapInput>;

export interface CreateMapViewInput {
  name: string;
  key?: string;
  sortOrder?: number;
  isActive?: boolean;
}
export type UpdateMapViewInput = Partial<Omit<CreateMapViewInput, "key">>;

export interface MarkerDraftInput {
  facilityId: string;
  x: number | null;
  y: number | null;
}

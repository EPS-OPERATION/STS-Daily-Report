import type { PermitType, StandardItemKind } from "@sts/shared";

export interface StandardItem {
  id: string;
  kind: StandardItemKind;
  label: string;
  buildingId: string | null;
  defaultCount: number;
  permitType: PermitType | null;
  highRisk: boolean;
  taskName: string;
  supervisorName: string;
}

// What a form sends to save. Optional fields are left out instead of sent as null.
export interface StandardItemDraft {
  kind: StandardItemKind;
  label: string;
  buildingId?: string;
  defaultCount: number;
  permitType?: PermitType;
  highRisk?: boolean;
  taskName?: string;
  supervisorName?: string;
}

// The part of a building the panel shows (every building list in the report pages has these).
export interface StandardItemBuilding {
  id: string;
  code: string;
  name: string;
}

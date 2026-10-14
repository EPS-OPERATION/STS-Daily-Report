import type { PermitType, StandardItemKind } from "@sts/shared";

export interface StandardItemInput {
  kind: StandardItemKind;
  label: string;
  buildingId?: string;
  defaultCount: number;
  permitType?: PermitType;
  highRisk?: boolean;
  taskName?: string;
  supervisorName?: string;
}

export interface MergeStandardItemsInput {
  contractorId: string;
  items: StandardItemInput[];
}

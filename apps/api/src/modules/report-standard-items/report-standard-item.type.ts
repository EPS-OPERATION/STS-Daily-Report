import type { StandardItemKind } from "@sts/shared";

export interface StandardItemInput {
  kind: StandardItemKind;
  label: string;
  buildingId?: string;
  defaultCount: number;
  /** Built-in code or a project-defined permit type code. */
  permitType?: string;
  highRisk?: boolean;
  taskName?: string;
  supervisorName?: string;
}

export interface MergeStandardItemsInput {
  contractorId: string;
  items: StandardItemInput[];
}

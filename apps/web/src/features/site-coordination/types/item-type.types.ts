export interface CreateItemTypeInput {
  code?: string;
  label: string;
  labelTh: string;
  iconKey: string;
  sortOrder?: number;
}

export interface UpdateItemTypeInput {
  label?: string;
  labelTh?: string;
  iconKey?: string;
  sortOrder?: number;
  isActive?: boolean;
}

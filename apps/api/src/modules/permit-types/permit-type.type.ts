export interface CreatePermitTypeInput {
  code: string;
  label: string;
  labelTh: string;
  iconKey?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface UpdatePermitTypeInput {
  label?: string;
  labelTh?: string;
  iconKey?: string;
  sortOrder?: number;
  isActive?: boolean;
}

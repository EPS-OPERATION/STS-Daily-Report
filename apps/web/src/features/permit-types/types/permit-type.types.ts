export interface PermitTypeItem {
  id: string;
  projectId: string;
  code: string;
  label: string;
  labelTh: string;
  iconKey: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

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

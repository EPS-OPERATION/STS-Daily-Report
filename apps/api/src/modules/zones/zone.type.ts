export interface Zone {
  id: string;
  projectId: string;
  parentId: string | null;
  code: string;
  name: string;
  description: string | null;
  sortOrder: number;
  status: string;
}

export interface ListZonesQuery {
  status?: string;
}

export interface NormalizedPoint {
  x: number;
  y: number;
}

export interface SitePlanPoint {
  id: string;
  zoneId: string;
  zone: {
    id: string;
    code: string;
    name: string;
    parentId: string | null;
    sortOrder: number;
    displayColor: string;
  };
  x: number;
  y: number;
  legacyDerived?: boolean;
}

export interface PolygonGeometry {
  type: "polygon";
  points: NormalizedPoint[];
}

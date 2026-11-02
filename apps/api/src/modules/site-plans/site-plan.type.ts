export interface NormalizedPoint {
  x: number;
  y: number;
}

export interface PolygonGeometry {
  type: "polygon";
  points: NormalizedPoint[];
}

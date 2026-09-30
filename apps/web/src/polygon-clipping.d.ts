// The published ESM bundle of polygon-clipping only exposes a default export
// object ({ union, intersection, xor, difference }) while its bundled types
// declare named exports. This augmentation aligns the types with the runtime
// shape so both Vite dev and the production Rollup build resolve identically.
declare module "polygon-clipping" {
  import type { MultiPolygon, Polygon } from "polygon-clipping";

  export interface PolygonClippingApi {
    union(geom: Polygon, ...geoms: Polygon[]): MultiPolygon;
    intersection(geom: Polygon, ...geoms: Polygon[]): MultiPolygon;
    xor(geom: Polygon, ...geoms: Polygon[]): MultiPolygon;
    difference(subjectGeom: Polygon, ...clipGeoms: Polygon[]): MultiPolygon;
  }

  const polygonClipping: PolygonClippingApi;
  export default polygonClipping;
}

// Other features import the maps through here. The map components are lazy wrappers (see components/lazy-map.tsx)
// and the pages (road register, print report) are routed directly, so importing this barrel does not load Konva.
export { ContractorMapPages, CoordinationWorkspace, RoadMapStage } from "./components/lazy-map.js";
export type { MapDot, RoadLine } from "./components/road-map-stage.js";
export { coordinationApi } from "./api/coordination.api.js";
export { useCoordination, coordinationKeys, useRoadSegments, useSaveRoadSegment, useDeleteRoadSegment } from "./hooks/use-coordination.js";

import { lazy, Suspense, type ComponentProps } from "react";
import { BlockSkeleton } from "@/components/ui/skeletons.js";
import type { CoordinationWorkspace as CoordinationWorkspaceImpl } from "./coordination-workspace.js";
import type { RoadMapStage as RoadMapStageImpl } from "./road-map-stage.js";
import type { ContractorMapPages as ContractorMapPagesImpl } from "./contractor-map-pages.js";

// The Konva map engine is ~160 KB gzip. Other features reach the maps through this feature's barrel, so the
// barrel exports these wrappers: the map code is fetched only when a map is actually rendered, instead of
// being pulled into every page that merely shares a form with a road picker.
const Workspace = lazy(() => import("./coordination-workspace.js").then((m) => ({ default: m.CoordinationWorkspace })));
const MapPages = lazy(() => import("./contractor-map-pages.js").then((m) => ({ default: m.ContractorMapPages })));
const Stage = lazy(() => import("./road-map-stage.js").then((m) => ({ default: m.RoadMapStage })));

export function CoordinationWorkspace(props: ComponentProps<typeof CoordinationWorkspaceImpl>) {
  return <Suspense fallback={<BlockSkeleton height={props.compact ? 390 : 480} />}><Workspace {...props} /></Suspense>;
}

export function RoadMapStage(props: ComponentProps<typeof RoadMapStageImpl>) {
  return <Suspense fallback={<BlockSkeleton height={typeof props.height === "number" ? props.height : 300} />}><Stage {...props} /></Suspense>;
}

// The contractor's part of the Map on the printed daily report (no skeleton: it is a print page).
export function ContractorMapPages(props: ComponentProps<typeof ContractorMapPagesImpl>) {
  return <Suspense fallback={null}><MapPages {...props} /></Suspense>;
}

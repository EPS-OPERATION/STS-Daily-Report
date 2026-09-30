export type ConfigMapClickAction =
  { type: "add-drawing-point" } | { type: "add-vertex" } | { type: "select-zone"; zoneId: string } | { type: "none" };

export function getConfigMapClickAction({
  drawing,
  addPointMode,
  boundaryEditing,
  selectedZoneId,
  clickedZoneId,
}: {
  drawing: boolean;
  addPointMode: boolean;
  boundaryEditing: boolean;
  selectedZoneId: string | null;
  clickedZoneId: string | null;
}): ConfigMapClickAction {
  if (drawing) return { type: "add-drawing-point" };
  if (addPointMode && boundaryEditing && selectedZoneId && clickedZoneId === selectedZoneId) {
    return { type: "add-vertex" };
  }
  return clickedZoneId ? { type: "select-zone", zoneId: clickedZoneId } : { type: "none" };
}

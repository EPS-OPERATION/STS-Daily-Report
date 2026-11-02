import { useTheme } from "@mui/material/styles";
import { useState } from "react";
import { useCurrentProject } from "@/features/projects/index.js";
import { useSiteMap, useSiteMapWriter, type MapMarker, type MapPoint, type PartInput, type SiteMapBuilding, type SiteMapView } from "@/features/site-plan/index.js";
import { HttpError } from "@/services/http/client.js";

export type PartDraft = PartInput & { id: string | null };
export const VIEW_LABEL: Record<SiteMapView, string> = { overview: "Overview", topview: "Top view", plan: "Plan" };
type PendingConfirm = { title: string; description?: string; confirmLabel?: string; run: () => void };

export function useSiteMapEditor() {
  const theme = useTheme();
  const { projectId } = useCurrentProject();
  const map = useSiteMap(projectId);
  const writer = useSiteMapWriter(projectId);

  const [view, setView] = useState<SiteMapView>("overview");
  const [search, setSearch] = useState("");
  const [buildingId, setBuildingId] = useState<string | null>(null);
  const [mode, setMode] = useState<"building" | "parts">("building");
  const [pendingPoint, setPendingPoint] = useState<MapPoint | null>(null); // building marker, unsaved
  const [part, setPart] = useState<PartDraft | null>(null); // selected / new work part, editable copy
  const [partPoint, setPartPoint] = useState<MapPoint | null>(null); // part marker, unsaved
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null);

  const buildings = map.data?.data ?? [];
  const building = buildings.find((b) => b.id === buildingId) ?? null;
  const savedPart = building?.parts.find((p) => p.id === part?.id) ?? null;
  const partDirty =
    part !== null &&
    (part.id === null ||
      part.code !== savedPart?.code ||
      part.name !== savedPart?.name ||
      part.status !== savedPart?.status ||
      partPoint !== null);
  const dirty = mode === "building" ? pendingPoint !== null : partDirty;
  const configured = buildings.filter((b) => b.markers[view]).length;
  const filtered = buildings.filter((b) => {
    const q = search.trim().toLowerCase();
    return !q || b.name.toLowerCase().includes(q) || b.code.toLowerCase().includes(q) || (b.nameTh ?? "").includes(q);
  });

  // Unsaved edits: confirm first, then run the navigation action.
  const guardDiscard = (next: () => void) => {
    if (dirty) setPendingConfirm({ title: "Discard unsaved changes?", description: "การแก้ไขที่ยังไม่บันทึกจะหายไป", confirmLabel: "Discard", run: next });
    else next();
  };
  const discard = () => {
    setPendingPoint(null);
    setPartPoint(null);
    setError(null);
    if (part) setPart(savedPart ? { id: savedPart.id, code: savedPart.code, name: savedPart.name, status: savedPart.status } : null);
  };
  const chooseBuilding = (id: string) => {
    if (id === buildingId) return;
    guardDiscard(() => {
      discard();
      setPart(null);
      setMode("building");
      setBuildingId(id);
    });
  };
  const chooseView = (v: SiteMapView) =>
    guardDiscard(() => {
      setPendingPoint(null);
      setPartPoint(null);
      setView(v);
    });
  const choosePart = (p: SiteMapBuilding["parts"][number]) =>
    guardDiscard(() => {
      setPartPoint(null);
      setPart({ id: p.id, code: p.code, name: p.name, status: p.status });
    });
  const newPart = (b: SiteMapBuilding) => {
    const used = new Set(b.parts.map((p) => p.code));
    const letter = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").find((l) => !used.has(l)) ?? String(b.parts.length + 1);
    setPartPoint(null);
    setPart({ id: null, code: letter, name: `Part ${letter}`, status: "active" });
  };

  const run = async (fn: () => Promise<void>) => {
    setSaving(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof HttpError ? e.message : "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  const save = (andNext: boolean) =>
    run(async () => {
      if (!building) return;
      if (mode === "building") {
        let latest = buildings;
        if (pendingPoint) latest = await writer.setBuildingMarker(building.id, view, pendingPoint);
        setPendingPoint(null);
        if (andNext) {
          // next facility (site order) still without a marker in this view
          const idx = latest.findIndex((b) => b.id === building.id);
          const next = [...latest.slice(idx + 1), ...latest.slice(0, idx)].find((b) => !b.markers[view]);
          if (next) setBuildingId(next.id);
        }
        return;
      }
      if (!part) return;
      const input = { code: part.code.trim(), name: part.name.trim(), status: part.status };
      if (!input.code || !input.name) throw new Error("ระบุชื่อและรหัส Part");
      let id = part.id;
      if (id === null) id = await writer.createPart(building.id, input);
      else if (partDirty) await writer.updatePart(id, input);
      if (partPoint) await writer.setPartMarker(id, view, partPoint);
      setPartPoint(null);
      if (andNext) newPart(building);
      else setPart({ id, ...input });
    });

  // ---- map markers ----
  const markers: MapMarker[] =
    mode === "building"
      ? buildings.flatMap((b) => {
          const isSel = b.id === buildingId;
          const point = isSel && pendingPoint ? pendingPoint : b.markers[view];
          if (!point) return [];
          return [
            {
              id: b.id,
              kind: "building" as const,
              label: b.code,
              title: b.name,
              point,
              selected: isSel,
              draggable: isSel,
              tone: isSel ? { bg: theme.palette.primary.main, fg: theme.palette.common.white } : undefined,
            },
          ];
        })
      : building
        ? [
            ...(building.markers[view]
              ? [{ id: building.id, kind: "building" as const, label: building.code, title: building.name, point: building.markers[view]!, dimmed: true }]
              : []),
            ...building.parts.flatMap((p) => {
              const isSel = p.id === part?.id;
              const point = isSel && partPoint ? partPoint : p.markers[view];
              if (!point) return [];
              return [
                {
                  id: p.id,
                  kind: "part" as const,
                  label: isSel ? part!.code : p.code,
                  title: `${p.name}${p.status === "inactive" ? " (inactive)" : ""}`,
                  point,
                  selected: isSel,
                  draggable: isSel,
                  dimmed: p.status === "inactive",
                  tone: isSel ? { bg: theme.palette.primary.main, fg: theme.palette.common.white } : undefined,
                },
              ];
            }),
            ...(part && part.id === null && partPoint
              ? [{ id: "new", kind: "part" as const, label: part.code, title: part.name, point: partPoint, selected: true, draggable: true, tone: { bg: theme.palette.primary.main, fg: theme.palette.common.white } }]
              : []),
          ]
        : [];

  const canPlace = mode === "building" ? Boolean(building) : Boolean(part);
  const placeHint =
    mode === "building"
      ? building
        ? "คลิกบนแผนที่เพื่อวางหมุด · ลากหมุดเพื่อย้าย"
        : "เลือกอาคารจากรายการทางซ้าย"
      : part
        ? "คลิกบนแผนที่เพื่อวางหมุดของ Part นี้ · ลากเพื่อย้าย"
        : "เลือกหรือเพิ่ม Part ก่อน";

  const currentPoint = pendingPoint ?? building?.markers[view] ?? null;

  return {
    theme,
    projectId,
    map,
    writer,
    view,
    setView,
    search,
    setSearch,
    buildingId,
    setBuildingId,
    mode,
    setMode,
    pendingPoint,
    setPendingPoint,
    part,
    setPart,
    partPoint,
    setPartPoint,
    saving,
    setSaving,
    error,
    setError,
    pendingConfirm,
    setPendingConfirm,
    buildings,
    building,
    savedPart,
    partDirty,
    dirty,
    configured,
    filtered,
    guardDiscard,
    discard,
    chooseBuilding,
    chooseView,
    choosePart,
    newPart,
    run,
    save,
    markers,
    canPlace,
    placeHint,
    currentPoint,
    VIEW_LABEL,
  };
}

export type SiteMapEditor = ReturnType<typeof useSiteMapEditor>;

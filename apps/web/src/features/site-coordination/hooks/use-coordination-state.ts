import dayjs from "dayjs";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  MAP_TITLE_MAX,
  mapContractorColors,
  type LegacyAreaMarker,
  type SiteCalloutMarker,
} from "../types/coordination.types.js";
import { INITIAL_CALLOUT_MARKERS } from "../data/seed-coordination.js";

// v4 = markers only; each marker may own its area. Older data is migrated on load:
// v3 stand-alone areas become 📍 markers that own the area, v2 pins (no date) move to today.
// Still per browser (localStorage) — there is no API yet.
const STORAGE_KEY = "sts_site_map_v4";
const V3_KEY = "sts_site_map_v3";
const V2_KEY = "sts_site_map_callouts_v2";

const todayIso = () => dayjs().format("YYYY-MM-DD");
const nowStamp = () => dayjs().format("YYYY-MM-DD HH:mm");
const newId = () => `callout-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

// Long v2/v3 texts become title (first 40 chars) + comment (the full text).
const splitText = (m: SiteCalloutMarker): SiteCalloutMarker =>
  m.text.length > MAP_TITLE_MAX && !m.comment ? { ...m, text: `${m.text.slice(0, MAP_TITLE_MAX - 1)}…`, comment: m.text } : m;

const areaToMarker = (a: LegacyAreaMarker): SiteCalloutMarker => ({
  id: a.id,
  date: a.date,
  contractorCode: a.contractorCode,
  contractorName: a.contractorName,
  icon: "pin",
  text: a.label,
  area: { x: a.x, y: a.y, w: a.w, h: a.h },
  targetX: a.x + a.w / 2,
  targetY: a.y + a.h / 2,
  boxX: Math.min(0.97, a.x + a.w + 0.06),
  boxY: a.y + a.h / 2,
  createdAt: a.createdAt,
});

function loadMarkers(): SiteCalloutMarker[] {
  try {
    const v4 = localStorage.getItem(STORAGE_KEY);
    if (v4) return JSON.parse(v4) as SiteCalloutMarker[];
    const v3 = localStorage.getItem(V3_KEY);
    if (v3) {
      const old = JSON.parse(v3) as { markers?: SiteCalloutMarker[]; areas?: LegacyAreaMarker[] };
      return [...(old.markers ?? []).map(splitText), ...(old.areas ?? []).map(areaToMarker)];
    }
    const v2 = localStorage.getItem(V2_KEY);
    if (v2) return (JSON.parse(v2) as Omit<SiteCalloutMarker, "date">[]).map((m) => splitText({ ...m, date: todayIso() }));
  } catch {
    // unreadable storage → start from the sample
  }
  return INITIAL_CALLOUT_MARKERS.map((m) => splitText({ ...m, date: todayIso() }));
}

// Map state for one day. Colours are per contractor among everything on that day
// (not only the filtered ones), so filtering never changes a contractor's colour.
export function useCoordinationState(date: string = todayIso()) {
  const [all, setAll] = useState<SiteCalloutMarker[]>(loadMarkers);
  const [selectedContractor, setSelectedContractor] = useState<string>("all");
  const [selectedContractors, setSelectedContractors] = useState<Set<string> | null>(null);
  const [activeMarkerId, setActiveMarkerId] = useState<string | null>(null);
  const [mapView, setMapView] = useState<"plan" | "topview">("plan");

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    } catch {
      // storage full / blocked — keep working in memory
    }
  }, [all]);

  const markers = useMemo(() => all.filter((m) => m.date === date), [all, date]);

  const colors = useMemo(
    () =>
      mapContractorColors(
        [...markers].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id)).map((m) => m.contractorCode),
      ),
    [markers],
  );

  const dayContractors = useMemo(() => {
    const byCode = new Map<string, string>();
    for (const m of markers) byCode.set(m.contractorCode, m.contractorName);
    return [...byCode].map(([code, name]) => ({ code, name })).sort((a, b) => a.code.localeCompare(b.code));
  }, [markers]);

  const filteredMarkers = useMemo(() => {
    if (selectedContractors !== null) {
      return markers.filter((m) => selectedContractors.has(m.contractorCode));
    }
    return selectedContractor === "all" ? markers : markers.filter((m) => m.contractorCode === selectedContractor);
  }, [markers, selectedContractor, selectedContractors]);

  // Most recent earlier day that has anything on it (for "copy from previous day").
  const previousDate = useMemo(() => {
    const earlier = all.map((m) => m.date).filter((d) => d < date);
    return earlier.length ? earlier.sort().at(-1)! : null;
  }, [all, date]);

  const activeMarker = useMemo(() => markers.find((m) => m.id === activeMarkerId) ?? null, [markers, activeMarkerId]);

  const addCallout = useCallback(
    (item: Omit<SiteCalloutMarker, "id" | "createdAt" | "date">) => {
      const marker: SiteCalloutMarker = { ...item, id: newId(), date, createdAt: nowStamp() };
      setAll((prev) => [...prev, marker]);
      setActiveMarkerId(marker.id);
      return marker.id;
    },
    [date],
  );

  const updateCallout = useCallback((id: string, updates: Partial<SiteCalloutMarker>) => {
    setAll((prev) => prev.map((m) => (m.id === id ? { ...m, ...updates } : m)));
  }, []);

  const updateTargetPosition = useCallback(
    (id: string, targetX: number, targetY: number) => updateCallout(id, { targetX, targetY }),
    [updateCallout],
  );

  const updateBoxPosition = useCallback((id: string, boxX: number, boxY: number) => updateCallout(id, { boxX, boxY }), [updateCallout]);

  const deleteCallout = useCallback((id: string) => {
    setAll((prev) => prev.filter((m) => m.id !== id));
    setActiveMarkerId((curr) => (curr === id ? null : curr));
  }, []);

  // Copies every job of `previousDate` onto the viewed day (added to what is there).
  const copyFromPreviousDay = useCallback(() => {
    if (!previousDate) return;
    setAll((prev) => [
      ...prev,
      ...prev.filter((m) => m.date === previousDate).map((m) => ({ ...m, id: newId(), date, createdAt: nowStamp() })),
    ]);
  }, [previousDate, date]);

  // Replaces the viewed day with the sample pins (other days are untouched).
  const resetToDefault = useCallback(() => {
    setAll((prev) => [...prev.filter((m) => m.date !== date), ...INITIAL_CALLOUT_MARKERS.map((m) => splitText({ ...m, date }))]);
    setActiveMarkerId(null);
  }, [date]);

  return {
    markers,
    filteredMarkers,
    colors,
    dayContractors,
    previousDate,
    activeMarker,
    activeMarkerId,
    setActiveMarkerId,
    selectedContractor,
    setSelectedContractor,
    selectedContractors,
    setSelectedContractors,
    mapView,
    setMapView,
    addCallout,
    updateTargetPosition,
    updateBoxPosition,
    updateCallout,
    deleteCallout,
    copyFromPreviousDay,
    resetToDefault,
  };
}

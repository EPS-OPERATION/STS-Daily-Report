import { useCallback, useEffect, useMemo, useState } from "react";
import type { SiteCalloutMarker } from "../types/coordination.types.js";
import { INITIAL_CALLOUT_MARKERS } from "../data/seed-coordination.js";

const STORAGE_KEY = "sts_site_map_callouts_v2";

export function useCoordinationState() {
  const [markers, setMarkers] = useState<SiteCalloutMarker[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // fallback
    }
    return INITIAL_CALLOUT_MARKERS;
  });

  const [selectedContractor, setSelectedContractor] = useState<string>("all");
  const [activeMarkerId, setActiveMarkerId] = useState<string | null>(null);
  const [mapView, setMapView] = useState<"plan" | "topview">("plan");

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(markers));
    } catch {
      // ignore
    }
  }, [markers]);

  const filteredMarkers = useMemo(() => {
    if (selectedContractor === "all") return markers;
    return markers.filter((m) => m.contractorCode === selectedContractor);
  }, [markers, selectedContractor]);

  const activeMarker = useMemo(() => {
    return markers.find((m) => m.id === activeMarkerId) ?? null;
  }, [markers, activeMarkerId]);

  const addCallout = useCallback(
    (item: Omit<SiteCalloutMarker, "id" | "createdAt">) => {
      const newMarker: SiteCalloutMarker = {
        ...item,
        id: `callout-${Date.now()}`,
        createdAt: new Date().toISOString().slice(0, 16).replace("T", " "),
      };
      setMarkers((prev) => [...prev, newMarker]);
      setActiveMarkerId(newMarker.id);
      return newMarker.id;
    },
    []
  );

  const updateTargetPosition = useCallback((id: string, targetX: number, targetY: number) => {
    setMarkers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, targetX, targetY } : m))
    );
  }, []);

  const updateBoxPosition = useCallback((id: string, boxX: number, boxY: number) => {
    setMarkers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, boxX, boxY } : m))
    );
  }, []);

  const updateCallout = useCallback((id: string, updates: Partial<SiteCalloutMarker>) => {
    setMarkers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...updates } : m))
    );
  }, []);

  const deleteCallout = useCallback((id: string) => {
    setMarkers((prev) => prev.filter((m) => m.id !== id));
    setActiveMarkerId((curr) => (curr === id ? null : curr));
  }, []);

  const resetToDefault = useCallback(() => {
    setMarkers(INITIAL_CALLOUT_MARKERS);
    setActiveMarkerId(null);
  }, []);

  return {
    markers,
    filteredMarkers,
    activeMarker,
    activeMarkerId,
    setActiveMarkerId,
    selectedContractor,
    setSelectedContractor,
    mapView,
    setMapView,
    addCallout,
    updateTargetPosition,
    updateBoxPosition,
    updateCallout,
    deleteCallout,
    resetToDefault,
  };
}

import { useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { CHART_OTHER } from "@/app/theme/chart-palette.js";
import { contractorColorMap } from "@/features/contractors/index.js";
import { addDaysIso, formatThaiDate, todayIso } from "@/lib/dates.js";
import { useInspectionRequests } from "@/features/qaqc/index.js";
import { useAdjustRoadUsage } from "../hooks/use-road-usage.js";
import { useDailyRequests } from "../hooks/use-daily-requests.js";
import { useCurrentProject, useProjectContractors } from "@/features/projects/index.js";
import { useMe } from "@/features/auth/index.js";
import { isEpsStaff } from "@sts/shared";
import { HttpError } from "@/services/http/client.js";
import { ISO_DATE } from "../components/today-requests-parts.js";
import type { View } from "../components/today-requests-parts.js";
import { buildRequestSections } from "../utils/request-sections.js";
import { summarizeDays } from "../utils/day-summary.js";



export function useTodayRequests() {
  const [params, setParams] = useSearchParams();
  const view: View = params.get("view") === "plan" ? "plan" : "requests";
  // Range from the URL; an old ?date= link still works as a one-day range.
  // Forecasts are about tomorrow, so that view opens on tomorrow when no range is given.
  const fallback = view === "plan" ? addDaysIso(todayIso(), 1) : todayIso();
  const single = ISO_DATE.test(params.get("date") ?? "") ? params.get("date")! : fallback;
  const rawFrom = ISO_DATE.test(params.get("from") ?? "") ? params.get("from")! : single;
  const rawTo = ISO_DATE.test(params.get("to") ?? "") ? params.get("to")! : rawFrom;
  const from = rawFrom <= rawTo ? rawFrom : rawTo;
  const to = rawFrom <= rawTo ? rawTo : rawFrom;
  const isRange = from !== to;
  const { projectId } = useCurrentProject();
  const projectContractors = useProjectContractors(projectId).data?.data ?? [];
  const week = useDailyRequests(projectId, from, to);
  const rfi = useInspectionRequests(projectId, { from, to, by: "inspection" });

  const data = week.data?.data;
  const allMachines = useMemo(() => data?.machinery ?? [], [data]);
  const allEquipment = useMemo(() => data?.equipmentRequests ?? [], [data]);
  const allRoads = useMemo(() => data?.roads ?? [], [data]);
  const allForecasts = useMemo(() => data?.forecasts ?? [], [data]);
  const allInspections = useMemo(() => (rfi.data?.data ?? []).filter((r) => r.status !== "draft"), [rfi.data]);
  const me = useMe();
  const canEdit = isEpsStaff(me.data?.data.user.role);
  const adjustRoad = useAdjustRoadUsage(projectId);
  // EPS only: the booking whose time is being settled.
  const [editing, setEditing] = useState<(typeof allRoads)[number] | null>(null);

  // Contractor filter (same popover as Manpower): everyone with a request or forecast in the range.
  // ?contractors=A,B in the URL; absent = all. Road clashes stay flagged even when the other side is hidden.
  const contractorNames = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of projectContractors) {
      if (c.code) m.set(c.code, c.name);
    }
    for (const r of [...allMachines, ...allEquipment, ...allRoads, ...allForecasts, ...allInspections]) {
      const name = "contractorName" in r && r.contractorName ? r.contractorName : undefined;
      if (name || !m.has(r.contractorCode)) m.set(r.contractorCode, name ?? m.get(r.contractorCode) ?? "");
    }
    return m;
  }, [projectContractors, allMachines, allEquipment, allRoads, allForecasts, allInspections]);

  const activeCodes = useMemo(() => {
    const set = new Set<string>();
    for (const r of [...allMachines, ...allEquipment, ...allRoads, ...allForecasts, ...allInspections]) {
      set.add(r.contractorCode);
    }
    return set;
  }, [allMachines, allEquipment, allRoads, allForecasts, allInspections]);

  const allCodes = useMemo(() => {
    const codes = activeCodes.size > 0 ? [...activeCodes] : projectContractors.map((c) => c.code);
    return codes.sort((a, b) => a.localeCompare(b));
  }, [activeCodes, projectContractors]);

  const selectedCodes = useMemo<Set<string>>(() => {
    const raw = params.get("contractors");
    if (raw === null) return new Set(allCodes);
    return new Set(raw.split(",").map((c) => c.trim()).filter((c) => allCodes.includes(c)));
  }, [params, allCodes]);
  const keep = (r: { contractorCode: string }) => selectedCodes.has(r.contractorCode);
  const machines = allMachines.filter(keep);
  const equipment = allEquipment.filter(keep);
  // The evening form no longer asks for machines/equipment: their blocks only show when older requests fall in range.
  const hasMachines = machines.length > 0;
  const hasEquipment = equipment.length > 0;
  const roads = allRoads.filter(keep);
  // In a range every row needs its date; one day stays uncluttered.
  const dayCol = (_d: string): ReactNode[] => [];
  const dayHead: string[] = [];
  const inspections = allInspections.filter(keep);
  const loadError = [week.error, rfi.error].find((e) => e instanceof HttpError) as HttpError | undefined;
  const forecasts = allForecasts.filter(keep);
  const requestSections = (forPrint = false) => buildRequestSections({ machines, equipment, roads, inspections, contractorNames }, forPrint);
  // A range (up to 62 days) is shown as an overview of its days; one day is opened in detail (?day=YYYY-MM-DD).
  const [clashOnly, setClashOnly] = useState(false);
  const dayRows = useMemo(() => summarizeDays(machines, equipment, roads, inspections), [machines, equipment, roads, inspections]);
  const shownDays = clashOnly ? dayRows.filter((d) => d.clashes > 0) : dayRows;
  const requestedDay = params.get("day");
  const selectedDay =
    shownDays.find((d) => d.date === requestedDay)?.date ??
    shownDays.find((d) => d.clashes > 0)?.date ??
    shownDays[0]?.date ??
    from;
  const dayIndex = shownDays.findIndex((d) => d.date === selectedDay);
  const setDay = (date: string) => {
    const p = new URLSearchParams(params);
    p.set("day", date);
    setParams(p, { replace: true });
  };
  const dayMachines = isRange ? machines.filter((m) => m.targetDate === selectedDay) : machines;
  const dayEquipment = isRange ? equipment.filter((e) => e.targetDate === selectedDay) : equipment;
  const dayRoads = isRange ? roads.filter((r) => r.targetDate === selectedDay) : roads;
  const dayInspections = isRange ? inspections.filter((i) => i.inspectionDate === selectedDay) : inspections;
  const dayAllRoads = isRange ? allRoads.filter((r) => r.targetDate === selectedDay) : allRoads;

  const colors = useMemo(() => contractorColorMap(allCodes), [allCodes]);
  const filterItems = allCodes.map((code) => {
    const n =
      view === "plan"
        ? allForecasts.filter((r) => r.contractorCode === code).length
        : [...allMachines, ...allEquipment, ...allRoads, ...allInspections].filter((r) => r.contractorCode === code).length;
    return { code, name: contractorNames.get(code), color: colors.get(code) ?? CHART_OTHER, countLabel: `${n} รายการ` };
  });
  const setContractors = (next: Set<string>) => {
    const p = new URLSearchParams(params);
    if (next.size === allCodes.length) p.delete("contractors");
    else p.set("contractors", [...next].sort().join(","));
    setParams(p, { replace: true });
  };
  // Pairs of clashing road bookings (warn only — sorted out at the coordination meeting).
  const clashingRoads = roads.filter((r) => r.conflict);
  const rangeLabel = isRange ? `${formatThaiDate(from)} – ${formatThaiDate(to)}` : formatThaiDate(from);

  const setView = (next: View) => {
    const p = new URLSearchParams(params);
    if (next === "plan") p.set("view", "plan");
    else p.delete("view");
    setParams(p, { replace: true });
  };

  const setRange = (f: string, t: string) => {
    const p = new URLSearchParams(params);
    p.delete("date");
    p.set("from", f);
    p.set("to", t);
    setParams(p, { replace: true });
  };
  return {
    params,
    setParams,
    view,
    fallback,
    single,
    rawFrom,
    rawTo,
    from,
    to,
    isRange,
    projectId,
    projectContractors,
    week,
    rfi,
    data,
    allMachines,
    allEquipment,
    allRoads,
    allForecasts,
    allInspections,
    me,
    canEdit,
    adjustRoad,
    editing,
    setEditing,
    contractorNames,
    activeCodes,
    allCodes,
    selectedCodes,
    keep,
    machines,
    equipment,
    hasMachines,
    hasEquipment,
    roads,
    dayCol,
    dayHead,
    inspections,
    loadError,
    forecasts,
    requestSections,
    clashOnly,
    setClashOnly,
    dayRows,
    shownDays,
    requestedDay,
    selectedDay,
    dayIndex,
    setDay,
    dayMachines,
    dayEquipment,
    dayRoads,
    dayInspections,
    dayAllRoads,
    colors,
    filterItems,
    setContractors,
    clashingRoads,
    rangeLabel,
    setView,
    setRange,
  };
}

export type UseTodayRequestsState = ReturnType<typeof useTodayRequests>;

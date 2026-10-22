import { useLayoutEffect, useMemo, useRef, useState } from "react";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import dayjs from "dayjs";
import { useSearchParams } from "react-router-dom";
import { CHART_OTHER } from "@/app/theme/chart-palette.js";
import { useContractors, contractorColorMap } from "@/features/contractors/index.js";
import { type ContractorFilterItem } from "@/features/contractors/index.js";
import { addDaysIso, mondayOf, todayIso } from "@/lib/dates.js";
import { useManpowerSummary, usePositionMix } from "@/features/report-summaries/index.js";
import { useCurrentProject } from "@/features/projects/index.js";
import { HttpError } from "@/services/http/client.js";
import { PAGE_BOTTOM, ROW_GAP, MIN_PANEL, PANEL_CHROME, LEGEND } from "../components/manpower-parts.js";

export const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
export const MAX_DAYS = 62; // server limit per query

export function useManpowerPage() {
  const [params, setParams] = useSearchParams();
  const today = todayIso();
  // Opens on today; This week / This month widen it.
  const defaultFrom = today;
  const rawFrom = ISO_DATE.test(params.get("from") ?? "") ? params.get("from")! : defaultFrom;
  const rawTo = ISO_DATE.test(params.get("to") ?? "") ? params.get("to")! : today;
  const from = rawFrom <= rawTo ? rawFrom : rawTo;
  const to = rawFrom <= rawTo ? rawTo : rawFrom;
  const span = dayjs(to).diff(dayjs(from), "day") + 1;
  const tooLong = span > MAX_DAYS;
  const days = tooLong ? [] : Array.from({ length: span }, (_, i) => addDaysIso(from, i));

  const { projectId } = useCurrentProject();
  const queryProject = tooLong ? null : projectId;
  const summary = useManpowerSummary(queryProject, from, to);
  const positions = usePositionMix(queryProject, from, to);
  const contractorsList = useContractors({ page: 1, pageSize: 100 });

  const setRange = (f: string, t: string) => {
    const p = new URLSearchParams(params);
    p.set("from", f);
    p.set("to", t);
    setParams(p, { replace: true });
  };
  const presets = {
    today: [today, today],
    week: [mondayOf(today), addDaysIso(mondayOf(today), 6)],
    month: [dayjs(today).startOf("month").format("YYYY-MM-DD"), dayjs(today).endOf("month").format("YYYY-MM-DD")],
  } as const;
  const showToday = () => setRange(...presets.today);
  const thisWeek = () => setRange(...presets.week);
  const thisMonth = () => setRange(...presets.month);
  // Which preset the shown range is (highlighted button), if any.
  const activePreset = (Object.keys(presets) as (keyof typeof presets)[]).find((k) => presets[k][0] === from && presets[k][1] === to) ?? null;

  const data = summary.data?.data;
  const error = summary.error instanceof HttpError ? summary.error : null;

  // Contractor code to name mapping
  const contractorNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of contractorsList.data?.data ?? []) {
      map.set(c.code, c.name);
    }
    return map;
  }, [contractorsList.data?.data]);

  // All distinct contractor codes in current data scope
  const allCodes = useMemo(() => {
    const set = new Set<string>();
    for (const c of data?.contractors ?? []) set.add(c.contractorCode);
    for (const r of positions.data?.data ?? []) set.add(r.contractorCode);
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [data?.contractors, positions.data?.data]);

  const colors = useMemo(() => contractorColorMap(allCodes), [allCodes]);

  // Read selected contractors from URL query or default to all
  const selectedCodes = useMemo<Set<string>>(() => {
    const raw = params.get("contractors");
    if (raw === null) return new Set(allCodes);
    if (!raw.trim()) return new Set<string>();
    const list = raw
      .split(",")
      .map((s) => s.trim())
      .filter((s) => allCodes.includes(s));
    return new Set(list);
  }, [params, allCodes]);

  const updateContractorSelection = (next: Set<string>) => {
    const p = new URLSearchParams(params);
    if (next.size === allCodes.length || next.size === 0) {
      p.delete("contractors");
    } else {
      p.set("contractors", Array.from(next).sort().join(","));
    }
    setParams(p, { replace: true });
  };

  const removeContractor = (code: string) => {
    const next = new Set(selectedCodes);
    next.delete(code);
    updateContractorSelection(next);
  };

  const selectAllContractors = () => {
    updateContractorSelection(new Set(allCodes));
  };

  // Filter items for the Excel-like popover
  const filterItems = useMemo<ContractorFilterItem[]>(() => {
    return allCodes.map((code) => {
      const row = data?.contractors.find((c) => c.contractorCode === code);
      return {
        code,
        name: contractorNameMap.get(code),
        manDays: row?.manDays,
        color: colors.get(code) ?? CHART_OTHER,
      };
    });
  }, [allCodes, contractorNameMap, data?.contractors, colors]);

  const isFiltered = selectedCodes.size > 0 && selectedCodes.size < allCodes.length;
  const isNoneSelected = allCodes.length > 0 && selectedCodes.size === 0;

  // Filtered data slices according to selected contractors
  const filteredContractors = useMemo(() => {
    if (!data?.contractors) return [];
    return data.contractors.filter((c) => selectedCodes.has(c.contractorCode));
  }, [data?.contractors, selectedCodes]);

  const filteredDaily = useMemo(() => {
    if (!data?.daily) return [];
    return data.daily.filter((d) => selectedCodes.has(d.contractorCode));
  }, [data?.daily, selectedCodes]);

  const filteredByBuilding = useMemo(() => {
    if (!data?.byBuilding) return [];
    return data.byBuilding.map((b) => ({
      ...b,
      contractors: Object.fromEntries(
        Object.entries(b.contractors).filter(([code]) => selectedCodes.has(code)),
      ),
    }));
  }, [data?.byBuilding, selectedCodes]);

  const filteredPositions = useMemo(() => {
    if (!positions.data?.data) return [];
    return positions.data.data.filter((r) => selectedCodes.has(r.contractorCode));
  }, [positions.data?.data, selectedCodes]);

  // Dynamic KPI totals for filtered contractors
  const totals = useMemo(() => {
    if (!data) return { manDays: 0, manHours: 0, avgDaily: 0, count: 0 };
    if (!isFiltered && selectedCodes.size === allCodes.length) {
      return {
        manDays: data.totals.manDays,
        manHours: data.totals.manHours,
        avgDaily: data.totals.avgDaily,
        count: data.contractors.length,
      };
    }
    const manDays = filteredContractors.reduce((sum, c) => sum + c.manDays, 0);
    const manHours = filteredContractors.reduce((sum, c) => sum + c.manHours, 0);
    const byDay = new Map<string, number>();
    for (const d of filteredDaily) {
      byDay.set(d.date, (byDay.get(d.date) ?? 0) + d.headcount);
    }
    const reportedDays = [...byDay.values()].filter((v) => v > 0).length;
    const avgDaily = reportedDays ? Math.round(manDays / reportedDays) : 0;
    return { manDays, manHours, avgDaily, count: filteredContractors.length };
  }, [data, isFiltered, selectedCodes.size, allCodes.length, filteredContractors, filteredDaily]);

  const theme = useTheme();
  const wide = useMediaQuery(theme.breakpoints.up("lg"));
  const gridRef = useRef<HTMLDivElement | null>(null);
  const [panelHeight, setPanelHeight] = useState<number | null>(null);
  // Wide screens: the four charts fill what is left of the window in a 2x2 grid, so the page never scrolls.
  // Re-measured on resize and whenever a banner above the grid comes or goes.
  useLayoutEffect(() => {
    if (!wide) { setPanelHeight(null); return; }
    const measure = () => {
      const top = gridRef.current?.getBoundingClientRect().top;
      if (top === undefined) return;
      const free = window.innerHeight - (top + window.scrollY) - PAGE_BOTTOM;
      setPanelHeight(Math.max(MIN_PANEL, Math.floor((free - ROW_GAP) / 2)));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [wide, Boolean(data), isFiltered, isNoneSelected, Boolean(error), tooLong]);
  const chartHeight = panelHeight === null ? undefined : panelHeight - PANEL_CHROME;
  // Charts with a legend underneath: the legend sits outside the chart's own height.
  const legendChartHeight = chartHeight === undefined ? undefined : chartHeight - LEGEND;
  return {
    params,
    setParams,
    today,
    defaultFrom,
    rawFrom,
    rawTo,
    from,
    to,
    span,
    tooLong,
    days,
    projectId,
    queryProject,
    summary,
    positions,
    contractorsList,
    setRange,
    showToday,
    activePreset,
    thisWeek,
    thisMonth,
    data,
    error,
    contractorNameMap,
    allCodes,
    colors,
    selectedCodes,
    updateContractorSelection,
    removeContractor,
    selectAllContractors,
    filterItems,
    isFiltered,
    isNoneSelected,
    filteredContractors,
    filteredDaily,
    filteredByBuilding,
    filteredPositions,
    totals,
    theme,
    wide,
    gridRef,
    panelHeight,
    setPanelHeight,
    chartHeight,
    legendChartHeight,
  };
}

export type UseManpowerPageState = ReturnType<typeof useManpowerPage>;

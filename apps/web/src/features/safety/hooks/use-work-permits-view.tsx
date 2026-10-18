import { useTheme } from "@mui/material/styles";
import { type PermitType } from "@sts/shared";
import dayjs, { type Dayjs } from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { addDaysIso, mondayOf, todayIso } from "@/lib/dates.js";
import { useDailyRequests } from "@/features/daily-requests/index.js";
import { useCurrentProject, useProjectContractors } from "@/features/projects/index.js";



export function useWorkPermitsView({
  hideHeader = true,
  selectedContractorCodes,
  defaultFrom,
  defaultTo,
}: {
  hideHeader?: boolean;
  selectedContractorCodes?: Set<string>;
  defaultFrom?: string;
  defaultTo?: string;
} = {}) {
  const theme = useTheme();
  const { projectId } = useCurrentProject();

  const todayStr = todayIso();
  const tomorrowStr = addDaysIso(todayStr, 1);
  const mondayStr = mondayOf(todayStr);
  const sundayStr = addDaysIso(mondayStr, 6);
  const monthStartStr = dayjs().startOf("month").format("YYYY-MM-DD");
  const monthEndStr = dayjs().endOf("month").format("YYYY-MM-DD");

  const [from, setFrom] = useState<Dayjs | null>(dayjs(defaultFrom ?? todayStr));
  const [to, setTo] = useState<Dayjs | null>(dayjs(defaultTo ?? todayStr));
  const [type, setType] = useState<PermitType | "">("");
  const [building, setBuilding] = useState("");
  const [contractor, setContractor] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  useEffect(() => {
    if (defaultFrom) setFrom(dayjs(defaultFrom));
  }, [defaultFrom]);

  useEffect(() => {
    if (defaultTo) setTo(dayjs(defaultTo));
  }, [defaultTo]);

  const fromIso = (from ?? dayjs(todayStr)).format("YYYY-MM-DD");
  const toIso = (to ?? dayjs(todayStr)).format("YYYY-MM-DD");
  const query = useDailyRequests(projectId, fromIso, toIso);
  const permits = useMemo(() => query.data?.data.permits ?? [], [query.data]);
  const contractorList = useProjectContractors(projectId).data?.data ?? [];

  const namesByCode = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of contractorList) m.set(c.code, c.name);
    for (const p of permits) m.set(p.contractorCode, p.contractorName || m.get(p.contractorCode) || "");
    return m;
  }, [contractorList, permits]);

  useEffect(() => {
    setPage(0);
  }, [fromIso, toIso, type, building, contractor, rowsPerPage, selectedContractorCodes]);

  const matchContractor = (c: string) => {
    if (selectedContractorCodes && !selectedContractorCodes.has(c)) return false;
    if (contractor && c !== contractor) return false;
    return true;
  };

  const activePreset = useMemo(() => {
    if (fromIso === todayStr && toIso === todayStr) return "today";
    if (fromIso === tomorrowStr && toIso === tomorrowStr) return "tomorrow";
    if (fromIso === mondayStr && toIso === sundayStr) return "week";
    if (fromIso === monthStartStr && toIso === monthEndStr) return "month";
    return "";
  }, [fromIso, toIso, todayStr, tomorrowStr, mondayStr, sundayStr, monthStartStr, monthEndStr]);

  const handlePresetChange = (_: unknown, val: string | null) => {
    if (!val) return;
    if (val === "today") {
      setFrom(dayjs(todayStr));
      setTo(dayjs(todayStr));
    } else if (val === "tomorrow") {
      setFrom(dayjs(tomorrowStr));
      setTo(dayjs(tomorrowStr));
    } else if (val === "week") {
      setFrom(dayjs(mondayStr));
      setTo(dayjs(sundayStr));
    } else if (val === "month") {
      setFrom(dayjs(monthStartStr));
      setTo(dayjs(monthEndStr));
    }
  };

  // Faceted counts: type cards ignore the type filter; the chart ignores the contractor dropdown
  const forTypeCounts = useMemo(
    () => permits.filter((p) => (!building || p.buildingName === building) && matchContractor(p.contractorCode)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [permits, building, contractor, selectedContractorCodes],
  );
  const forChart = useMemo(
    () =>
      permits.filter(
        (p) => (!type || p.permitType === type) && (!building || p.buildingName === building) && matchContractor(p.contractorCode),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [permits, type, building, contractor, selectedContractorCodes],
  );
  const rows = useMemo(
    () =>
      permits.filter(
        (p) => (!type || p.permitType === type) && (!building || p.buildingName === building) && matchContractor(p.contractorCode),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [permits, type, building, contractor, selectedContractorCodes],
  );

  const typeCounts = useMemo(() => {
    const m = new Map<PermitType, number>();
    for (const p of forTypeCounts) m.set(p.permitType, (m.get(p.permitType) ?? 0) + 1);
    return m;
  }, [forTypeCounts]);

  const chartData = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of forChart) m.set(p.contractorCode, (m.get(p.contractorCode) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [forChart]);

  const buildingOptions = useMemo(
    () => [...new Set(permits.map((p) => p.buildingName).filter(Boolean))].sort(),
    [permits],
  );
  const contractorOptions = useMemo(
    () => [...new Set(permits.map((p) => p.contractorCode))].sort(),
    [permits],
  );

  const clearAll = () => {
    setFrom(dayjs(todayStr));
    setTo(dayjs(todayStr));
    setType("");
    setBuilding("");
    setContractor("");
  };

  const isFiltered = Boolean(type || building || contractor || activePreset !== "today");
  return {
    theme,
    projectId,
    todayStr,
    tomorrowStr,
    mondayStr,
    sundayStr,
    monthStartStr,
    monthEndStr,
    from,
    setFrom,
    to,
    setTo,
    type,
    setType,
    building,
    setBuilding,
    contractor,
    setContractor,
    page,
    setPage,
    rowsPerPage,
    setRowsPerPage,
    fromIso,
    toIso,
    query,
    permits,
    contractorList,
    namesByCode,
    matchContractor,
    activePreset,
    handlePresetChange,
    forTypeCounts,
    forChart,
    rows,
    typeCounts,
    chartData,
    buildingOptions,
    contractorOptions,
    clearAll,
    isFiltered,
    hideHeader,
    selectedContractorCodes,
    defaultFrom,
    defaultTo,
  };
}

export type UseWorkPermitsViewState = ReturnType<typeof useWorkPermitsView>;

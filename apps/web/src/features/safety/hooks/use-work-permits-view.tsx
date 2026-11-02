import { useTheme } from "@mui/material/styles";
import { PERMIT_TYPES, isEpsStaff } from "@sts/shared";
import dayjs, { type Dayjs } from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { addDaysIso, mondayOf, todayIso } from "@/lib/dates.js";
import { useMe } from "@/features/auth/index.js";
import { useDailyRequests } from "@/features/daily-requests/index.js";
import { usePermitTypes, type PermitTypeItem } from "@/features/permit-types/index.js";
import type { PermitEditItem } from "../components/permit-edit-dialog.js";
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
  const me = useMe();
  const canEdit = isEpsStaff(me.data?.data.user.role);
  // EPS: ✎ on a high-risk card / register row, ➕ to add a high-risk task on a day.
  const [editingPermit, setEditingPermit] = useState<PermitEditItem | null>(null);
  const [addingOn, setAddingOn] = useState<string | null>(null);
  // Permit type tiles: EPS adds with the dashed ➕ tile and edits with ✎ (same pattern as the High-Risk cards).
  // "new" = add, an item = edit. EPS also sees hidden types (faded) so they can be shown again.
  const [typeDialog, setTypeDialog] = useState<PermitTypeItem | "new" | null>(null);
  const { data: dynamicPermitTypes } = usePermitTypes(projectId, canEdit);
  const permitTypesList: (PermitTypeItem | (typeof PERMIT_TYPES)[number])[] =
    dynamicPermitTypes && dynamicPermitTypes.length > 0 ? dynamicPermitTypes : [...PERMIT_TYPES];

  const todayStr = todayIso();
  const tomorrowStr = addDaysIso(todayStr, 1);
  const mondayStr = mondayOf(todayStr);
  const sundayStr = addDaysIso(mondayStr, 6);
  const monthStartStr = dayjs().startOf("month").format("YYYY-MM-DD");
  const monthEndStr = dayjs().endOf("month").format("YYYY-MM-DD");

  const [from, setFrom] = useState<Dayjs | null>(dayjs(defaultFrom ?? todayStr));
  const [to, setTo] = useState<Dayjs | null>(dayjs(defaultTo ?? todayStr));
  const [type, setType] = useState<string>("");
  const [building, setBuilding] = useState("");
  const [contractor, setContractor] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

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
    const m = new Map<string, number>();
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
    canEdit,
    editingPermit,
    setEditingPermit,
    addingOn,
    setAddingOn,
    typeDialog,
    setTypeDialog,
    permitTypesList,
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

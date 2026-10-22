import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import { useTheme } from "@mui/material/styles";
import dayjs, { type Dayjs } from "dayjs";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CHART_OTHER } from "@/app/theme/chart-palette.js";
import { contractorColorMap } from "@/features/contractors/index.js";
import { addDaysIso, todayIso } from "@/lib/dates.js";
import { useDailyRequests } from "@/features/daily-requests/index.js";
import { useInspectionRequests } from "@/features/qaqc/index.js";
import { useManpowerSummary } from "@/features/report-summaries/index.js";
import { useCurrentProject, useProjectContractors } from "@/features/projects/index.js";
import { buildHighlights } from "../utils/dashboard-highlights.js";

export type Range = "today" | "week" | "month";

export const HIGHLIGHT_TONE = {
  error: { bg: "error.light", fg: "error.main", icon: ErrorOutlineIcon },
  info: { bg: "info.light", fg: "info.main", icon: InfoOutlinedIcon },
  warning: { bg: "warning.light", fg: "warning.dark", icon: WarningAmberOutlinedIcon },
  success: { bg: "success.light", fg: "success.main", icon: InfoOutlinedIcon },
} as const;

export function useDashboard() {
  const theme = useTheme();
  const [from, setFrom] = useState<Dayjs | null>(dayjs());
  const [to, setTo] = useState<Dayjs | null>(dayjs());

  const valid = Boolean(from && to && !to!.isBefore(from!, "day"));
  const days = valid ? to!.diff(from!, "day") : 0;
  const bucket: Range = days === 0 ? "today" : days < 8 ? "week" : "month";

  const [params, setParams] = useSearchParams();
  const { projectId } = useCurrentProject();
  const projectContractors = useProjectContractors(projectId).data?.data ?? [];
  const today = todayIso();
  const tomorrow = addDaysIso(today, 1);
  const rfi = useInspectionRequests(projectId, { from: today, to: tomorrow, by: "inspection" });
  const rfiRows = (rfi.data?.data ?? []).filter((r) => r.status !== "draft");
  const dailyReqs = useDailyRequests(projectId, today, today);
  const reqData = dailyReqs.data?.data;
  // The API may omit empty buckets — normalise so iteration is always safe.
  const reqRoads = reqData?.roads ?? [];
  const reqPermits = reqData?.permits ?? [];
  const reqMachinery = reqData?.machinery ?? [];
  const reqForecasts = reqData?.forecasts ?? [];

  // KPI cards for the picked range (real data, not the today-only request feed above).
  const fromIso = valid ? from!.format("YYYY-MM-DD") : today;
  const toIso = valid ? to!.format("YYYY-MM-DD") : today;
  const manpower = useManpowerSummary(projectId, fromIso, toIso);
  const rangeRequests = useDailyRequests(projectId, fromIso, toIso);
  const manpowerTotals = manpower.data?.data.totals;
  const contractorCount = manpower.data?.data.contractors.length ?? 0;
  const rangePermits = rangeRequests.data?.data.permits ?? [];
  const highRiskPermits = rangePermits.filter((p) => p.highRisk).length;

  const contractorNames = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of projectContractors) if (c.code) m.set(c.code, c.name);
    if (reqData) {
      for (const r of [...reqRoads, ...reqPermits, ...reqMachinery, ...reqForecasts]) {
        if ("contractorCode" in r && r.contractorCode) {
          m.set(r.contractorCode, ("contractorName" in r && r.contractorName ? r.contractorName : undefined) || m.get(r.contractorCode) || "");
        }
      }
    }
    for (const r of rfiRows) {
      if (r.contractorCode) m.set(r.contractorCode, r.contractorName || m.get(r.contractorCode) || "");
    }
    return m;
  }, [projectContractors, reqData, rfiRows]);

  const allCodes = useMemo(() => {
    const set = new Set<string>();
    if (reqData) {
      for (const r of [...reqRoads, ...reqPermits, ...reqMachinery, ...reqForecasts]) {
        if ("contractorCode" in r && r.contractorCode) set.add(r.contractorCode);
      }
    }
    for (const r of rfiRows) {
      if (r.contractorCode) set.add(r.contractorCode);
    }
    const codes = set.size > 0 ? [...set] : projectContractors.map((c) => c.code);
    return codes.sort((a, b) => a.localeCompare(b));
  }, [reqData, rfiRows, projectContractors]);

  const selectedCodes = useMemo<Set<string>>(() => {
    const raw = params.get("contractors");
    if (raw === null) return new Set(allCodes);
    return new Set(raw.split(",").map((c) => c.trim()).filter((c) => allCodes.includes(c)));
  }, [params, allCodes]);

  const setContractors = (next: Set<string>) => {
    const p = new URLSearchParams(params);
    if (next.size === allCodes.length) p.delete("contractors");
    else p.set("contractors", [...next].sort().join(","));
    setParams(p, { replace: true });
  };

  const colors = useMemo(() => contractorColorMap(allCodes, projectContractors), [allCodes, projectContractors]);

  const filterItems = useMemo(() => {
    return allCodes.map((code) => {
      let n = 0;
      if (reqData) {
        n += [...reqRoads, ...reqPermits, ...reqMachinery, ...reqForecasts].filter((r) => r.contractorCode === code).length;
      }
      n += rfiRows.filter((r) => r.contractorCode === code).length;
      return {
        code,
        name: contractorNames.get(code),
        color: colors.get(code) ?? CHART_OTHER,
        countLabel: `${n} รายการ`,
      };
    });
  }, [allCodes, reqData, rfiRows, contractorNames, colors]);

  const rfiToday = rfiRows.filter((r) => r.inspectionDate === today && selectedCodes.has(r.contractorCode)).length;
  const rfiTomorrow = rfiRows.filter((r) => r.inspectionDate === tomorrow && selectedCodes.has(r.contractorCode)).length;

  const dynamicHighlights = useMemo(
    () => buildHighlights({ requests: reqData, inspections: rfiRows, today, selectedCodes }),
    [reqData, rfiRows, today, selectedCodes],
  );
  const rangeLabel = !valid
    ? "End date is before start date — showing today's figures"
    : days === 0
      ? from!.format("MMM D, YYYY")
      : `${from!.format("MMM D")} – ${to!.format("MMM D, YYYY")} (${bucket === "week" ? "weekly" : "monthly"} figures)`;
  return {
    theme,
    from,
    setFrom,
    to,
    setTo,
    valid,
    days,
    bucket,
    params,
    setParams,
    projectId,
    projectContractors,
    today,
    tomorrow,
    rfi,
    rfiRows,
    dailyReqs,
    reqData,
    reqRoads,
    reqPermits,
    reqMachinery,
    reqForecasts,
    fromIso,
    toIso,
    manpower,
    rangeRequests,
    manpowerTotals,
    contractorCount,
    rangePermits,
    highRiskPermits,
    contractorNames,
    allCodes,
    selectedCodes,
    setContractors,
    colors,
    filterItems,
    rfiToday,
    rfiTomorrow,
    dynamicHighlights,
    rangeLabel,
  };
}

export type UseDashboardState = ReturnType<typeof useDashboard>;

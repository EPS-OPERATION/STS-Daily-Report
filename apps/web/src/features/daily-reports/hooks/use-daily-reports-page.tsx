import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { StatusChip } from "@/components/ui/status-chip.js";
import { CHART_OTHER } from "@/app/theme/chart-palette.js";
import { workDoneItemsFromSiteDay } from "../utils/work-done.js";
import { ALL_CONTRACTORS, countSubmissions, filterSubmissions, rfiCountByDay, type SubmissionFilter } from "../utils/submission.js";
import { contractorColorMap } from "@/features/contractors/index.js";
import { type WorkDoneItem } from "../components/work-done-summary-table.js";
import { formatThaiDate, todayIso } from "@/lib/dates.js";
import { useInspectionRequests } from "@/features/qaqc/index.js";
import { useReviewQueue } from "../hooks/use-daily-report-queries.js";
import { type InspectionRequest } from "@/features/qaqc/index.js";
import { type ReviewQueueRow } from "../types/daily-report.types.js";
import { useSiteDay } from "@/features/site-plan/index.js";
import { useCurrentProject, useProjectContractors } from "@/features/projects/index.js";
import { HttpError } from "@/services/http/client.js";

export const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export type PageViewMode = "work-summary" | "history";

/** Submission History rows shown at first, and added each time the list is scrolled to its end. */
const HISTORY_BATCH = 30;

export function useDailyReportsPage() {
  const [params, setParams] = useSearchParams();
  const single = ISO_DATE.test(params.get("date") ?? "") ? params.get("date")! : todayIso();
  const rawFrom = ISO_DATE.test(params.get("from") ?? "") ? params.get("from")! : single;
  const rawTo = ISO_DATE.test(params.get("to") ?? "") ? params.get("to")! : rawFrom;
  const from = rawFrom <= rawTo ? rawFrom : rawTo;
  const to = rawFrom <= rawTo ? rawTo : rawFrom;
  const isRange = from !== to;

  const [viewMode, setViewMode] = useState<PageViewMode>("work-summary");
  const [search, setSearch] = useState("");
  const [contractor, setContractor] = useState(ALL_CONTRACTORS);
  const [filter, setFilter] = useState<SubmissionFilter>("all");
  const [detail, setDetail] = useState<ReviewQueueRow | null>(null);

  const { projectId } = useCurrentProject();
  const projectContractors = useProjectContractors(projectId).data?.data ?? [];
  const history = useReviewQueue(projectId, { from, to });
  const inspections = useInspectionRequests(projectId, { from, to, by: "report" });
  const siteDay = useSiteDay(projectId, from, to);

  const setRange = (f: string, t: string) => {
    const p = new URLSearchParams(params);
    p.delete("date");
    p.set("from", f);
    p.set("to", t);
    setParams(p, { replace: true });
  };

  const queue: ReviewQueueRow[] = useMemo(() => history.data?.data ?? [], [history.data]);
  const requestList: InspectionRequest[] = useMemo(() => inspections.data?.data ?? [], [inspections.data]);

  // Aggregate work done allocations across all contractors from real DB
  const rawWorkDoneItems: WorkDoneItem[] = useMemo(() => workDoneItemsFromSiteDay(siteDay.data?.data?.buildings ?? []), [siteDay.data]);

  // Contractor lookup and codes
  const contractorNames = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of projectContractors) {
      if (c.code) m.set(c.code, c.name);
    }
    for (const q of queue) {
      if (q.contractorCode) m.set(q.contractorCode, q.contractorName || m.get(q.contractorCode) || "");
    }
    for (const item of rawWorkDoneItems) {
      if (item.contractorCode) m.set(item.contractorCode, item.contractorName || m.get(item.contractorCode) || "");
    }
    return m;
  }, [projectContractors, queue, rawWorkDoneItems]);

  const allCodes = useMemo(() => {
    const set = new Set<string>();
    for (const q of queue) if (q.contractorCode) set.add(q.contractorCode);
    for (const item of rawWorkDoneItems) if (item.contractorCode) set.add(item.contractorCode);
    const codes = set.size > 0 ? [...set] : projectContractors.map((c) => c.code);
    return codes.sort((a, b) => a.localeCompare(b));
  }, [queue, rawWorkDoneItems, projectContractors]);

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
      const n = queue.filter((q) => q.contractorCode === code && q.hasReport).length;
      return {
        code,
        name: contractorNames.get(code),
        color: colors.get(code) ?? CHART_OTHER,
        countLabel: `${n} รายงาน`,
      };
    });
  }, [allCodes, queue, contractorNames, colors]);

  // Filtered queue and work done items according to selectedCodes
  const visibleQueue = useMemo(
    () => queue.filter((q) => selectedCodes.has(q.contractorCode)),
    [queue, selectedCodes],
  );
  const workDoneItems = useMemo(
    () => rawWorkDoneItems.filter((item) => selectedCodes.has(item.contractorCode)),
    [rawWorkDoneItems, selectedCodes],
  );

  // RFI raised per contractor per report day.
  const rfiByDay = useMemo(() => rfiCountByDay(requestList), [requestList]);
  const counts = useMemo(() => countSubmissions(visibleQueue), [visibleQueue]);

  // Combined list of contractors for filtering work done
  const workContractorNames = useMemo(() => {
    const set = new Set<string>();
    for (const q of visibleQueue) set.add(q.contractorName);
    for (const item of workDoneItems) set.add(item.contractorName);
    return [...set].sort();
  }, [visibleQueue, workDoneItems]);

  const rows = useMemo(() => filterSubmissions(visibleQueue, { filter, contractor, search }), [visibleQueue, filter, contractor, search]);

  // Submission History loads more as you scroll (rows are already in memory): the first batch, then
  // `loadMoreHistory` adds the next; back to the first batch whenever the result set changes.
  const [historyShown, setHistoryShown] = useState(HISTORY_BATCH);
  useEffect(() => setHistoryShown(HISTORY_BATCH), [filter, contractor, search, from, to, selectedCodes]);
  const shownRows = useMemo(() => rows.slice(0, historyShown), [rows, historyShown]);
  const hasMoreHistory = shownRows.length < rows.length;
  const loadMoreHistory = useCallback(() => setHistoryShown((n) => n + HISTORY_BATCH), []);

  const loadError: HttpError | null =
    history.error instanceof HttpError
      ? history.error
      : inspections.error instanceof HttpError
        ? inspections.error
        : null;
  const loading = history.isPending;

  const shiftChip = (s: string) =>
    s === "submitted" ? <StatusChip status="submitted" label="Submitted" /> : <StatusChip status="draft" label="Not submitted" />;

  const dateRangeLabel = isRange ? `${formatThaiDate(from)} – ${formatThaiDate(to)}` : formatThaiDate(from);
  const pct = (n: number) => (counts.all > 0 ? `${Math.round((n / counts.all) * 100)}% ของทั้งหมด` : "—");
  return {
    params,
    setParams,
    single,
    rawFrom,
    rawTo,
    from,
    to,
    isRange,
    viewMode,
    setViewMode,
    search,
    setSearch,
    contractor,
    setContractor,
    filter,
    setFilter,
    detail,
    setDetail,
    projectId,
    projectContractors,
    history,
    inspections,
    siteDay,
    setRange,
    queue,
    requestList,
    rawWorkDoneItems,
    contractorNames,
    allCodes,
    selectedCodes,
    setContractors,
    colors,
    filterItems,
    visibleQueue,
    workDoneItems,
    rfiByDay,
    counts,
    workContractorNames,
    rows,
    shownRows,
    hasMoreHistory,
    loadMoreHistory,
    loadError,
    loading,
    shiftChip,
    dateRangeLabel,
    pct,
  };
}

export type UseDailyReportsPageState = ReturnType<typeof useDailyReportsPage>;

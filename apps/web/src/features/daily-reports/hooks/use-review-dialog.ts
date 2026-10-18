import { POSITIONS, WEATHER_CONDITIONS } from "@sts/shared";
import { useEffect, useState } from "react";
import { useCurrentProject } from "@/features/projects/index.js";
import { useCurrentReport } from "./use-daily-report-queries.js";
import type { DailyReport, ReviewQueueRow } from "../types/daily-report.types.js";



export function useReviewDialog({
  report,
  projectId: propProjectId,
  onClose,
}: {
  report: ReviewQueueRow | null;
  projectId?: string | null;
  onClose: () => void;
}) {
  const { projectId: contextProjectId } = useCurrentProject();
  const projectId = propProjectId ?? contextProjectId;

  const [tab, setTab] = useState(0);

  // Fetch real report from DB if available
  const reportQuery = useCurrentReport(
    projectId,
    report?.reportDate ?? "",
    report?.contractorId,
  );

  const data: DailyReport | null = reportQuery.data?.data.report ?? null;
  const dataLoading = reportQuery.isPending && report !== null;
  const dataError = reportQuery.error instanceof Error ? reportQuery.error : null;

  useEffect(() => {
    if (report) {
      setTab(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report?.id]);


  const weatherLabel = WEATHER_CONDITIONS.find((w) => w.code === data?.weather)?.label ?? data?.weather ?? "ปกติ";
  const positionLabel = (code: string) => POSITIONS.find((p) => p.code === code)?.labelTh ?? POSITIONS.find((p) => p.code === code)?.label ?? code;
  return {
    contextProjectId,
    projectId,
    tab,
    setTab,
    reportQuery,
    data,
    dataLoading,
    dataError,
    weatherLabel,
    positionLabel,
    report,
    propProjectId,
    onClose,
  };
}

export type UseReviewDialogState = ReturnType<typeof useReviewDialog>;

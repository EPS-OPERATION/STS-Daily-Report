import { POSITIONS, WEATHER_CONDITIONS } from "@sts/shared";
import { useEffect, useState } from "react";
import { usePrintReport } from "./use-daily-report-queries.js";
import type { PrintReport, ReviewQueueRow } from "../types/daily-report.types.js";

export type ReviewPart = "morning" | "evening";

export function useReviewDialog({ report, onClose }: { report: ReviewQueueRow | null; onClose: () => void }) {
  // The print payload is the whole filled form (+ RFIs raised, safety record).
  const reportQuery = usePrintReport(report?.id ?? null);
  const data: PrintReport | null = reportQuery.data?.data ?? null;
  const dataLoading = reportQuery.isPending && report?.id != null;
  const dataError = reportQuery.error instanceof Error ? reportQuery.error : null;

  // Open on the form that was sent (morning first when both were).
  const [part, setPart] = useState<ReviewPart>("morning");
  useEffect(() => {
    if (report) setPart(report.morningStatus === "submitted" || report.eveningStatus !== "submitted" ? "morning" : "evening");
  }, [report?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // No weather yet (morning not sent) is "—", never a default "ปกติ".
  const weatherLabel = data?.weather ? WEATHER_CONDITIONS.find((w) => w.code === data.weather)?.label ?? data.weather : "—";
  const positionLabel = (code: string) => POSITIONS.find((x) => x.code === code)?.labelTh ?? code;
  return { part, setPart, reportQuery, data, dataLoading, dataError, weatherLabel, positionLabel, report, onClose };
}

export type UseReviewDialogState = ReturnType<typeof useReviewDialog>;

import type { ReviewQueueRow } from "../types/daily-report.types.js";

// complete = both Daily Report (morning) and Daily Request (afternoon) sent; partial = one; none = nothing.
// `all` = every row where the contractor sent something (complete + partial); days with nothing sent
// only show under `none`, so the history lists real submissions by default.
export type SubmissionFilter = "all" | "complete" | "partial" | "none";

export const ALL_CONTRACTORS = "All Contractors";

export const submissionOf = (r: ReviewQueueRow): Exclude<SubmissionFilter, "all"> => {
  const sent = Number(r.morningStatus === "submitted") + Number(r.eveningStatus === "submitted");
  return sent === 2 ? "complete" : sent === 1 ? "partial" : "none";
};

export const isSubmissionFilter = (v: string | null): v is SubmissionFilter =>
  v === "all" || v === "complete" || v === "partial" || v === "none";

export function countSubmissions(queue: ReviewQueueRow[]) {
  // `all` = every row (the summary cards' total); `sent` = rows with something submitted (the «ส่งแล้ว» chip).
  const c = { all: queue.length, sent: 0, complete: 0, partial: 0, none: 0 };
  for (const r of queue) c[submissionOf(r)] += 1;
  c.sent = c.complete + c.partial;
  return c;
}

// The filter the Submission History table applies.
export function filterSubmissions(
  queue: ReviewQueueRow[],
  { filter, contractor, search }: { filter: SubmissionFilter; contractor: string; search: string },
) {
  const q = search.trim().toLowerCase();
  return queue.filter((r) => {
    const sent = submissionOf(r);
    if (filter === "all" ? sent === "none" : sent !== filter) return false;
    if (contractor !== ALL_CONTRACTORS && r.contractorName !== contractor) return false;
    if (q && !`${r.contractorName} ${r.contractorCode} ${r.reportDate}`.toLowerCase().includes(q)) return false;
    return true;
  });
}

// RFI raised per contractor per report day, keyed `${contractorId}|${reportDate}`.
export function rfiCountByDay(requests: { contractorId: string; reportDate: string }[]) {
  const m = new Map<string, number>();
  for (const r of requests) {
    const key = `${r.contractorId}|${r.reportDate}`;
    m.set(key, (m.get(key) ?? 0) + 1);
  }
  return m;
}

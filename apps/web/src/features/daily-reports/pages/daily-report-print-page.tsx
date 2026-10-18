import { Fragment, useEffect, useMemo, useRef } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { ALL_CONTRACTORS, filterSubmissions, isSubmissionFilter } from "../utils/submission.js";
import { todayIso } from "@/lib/dates.js";
import { usePrintReport, usePrintReports, useReviewQueue } from "../hooks/use-daily-report-queries.js";
import { useCurrentProject } from "@/features/projects/index.js";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { ISO_DATE } from "../components/print-shared.js";
import { PrintStyles } from "../components/print-shared.js";
import { ReportSheet } from "../components/summary-sheet.js";

// Printable EPS "Daily Request & Report" (form R003/20260702) filled from the submitted
// morning + evening data, plus a second page with what the paper form has no room for
// (morning vs afternoon crew, nationality/sex, tomorrow's requests, materials).
// Opens the print dialog once data and images have loaded — choose "Save as PDF".
export function DailyReportPrintPage() {
  const { reportId } = useParams();
  const query = usePrintReport(reportId ?? null);
  const printed = useRef(false);
  const r = query.data?.data;

  useEffect(() => {
    if (!r || printed.current) return;
    document.title = `Daily report ${r.contractorCode} ${r.reportDate}`;
    const imgs = Array.from(document.images);
    Promise.all(
      imgs.map((img) => (img.complete ? Promise.resolve() : new Promise((done) => { img.onload = img.onerror = () => done(null); }))),
    ).then(() => {
      printed.current = true;
      setTimeout(() => window.print(), 300);
    });
  }, [r]);

  if (query.isError) {
    return (
      <Stack alignItems="center" sx={{ py: 10 }}>
        <Typography color="error">เปิดรายงานไม่สำเร็จ — ไม่พบรายงานหรือไม่มีสิทธิ์เข้าถึง</Typography>
      </Stack>
    );
  }
  if (!r) {
    return (
      <Stack alignItems="center" spacing={2} sx={{ py: 10 }}>
        <CircularProgress />
        <Typography>กำลังเตรียมรายงาน…</Typography>
      </Stack>
    );
  }

  return (
    <Box sx={{ bgcolor: "#fff", color: "#000", fontFamily: "'Inter', 'Sarabun', sans-serif" }}>
      <PrintStyles />

      <Stack direction="row" spacing={1} className="no-print" sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
        <Button onClick={() => window.print()}>Print / Save as PDF</Button>
        <Typography variant="body2" color="text.secondary" sx={{ alignSelf: "center" }}>
          ในหน้าต่างพิมพ์ เลือก "Save as PDF" / "บันทึกเป็น PDF"
        </Typography>
      </Stack>

      <ReportSheet r={r} />
    </Box>
  );
}

// Combined R003 export: every sent report among the Submission History rows (same range + filter
// chip + contractor + search as the table), two A4 pages each, one print dialog.
export function DailyReportsBatchPrintPage() {
  const [params] = useSearchParams();
  const rawFrom = ISO_DATE.test(params.get("from") ?? "") ? params.get("from")! : todayIso();
  const rawTo = ISO_DATE.test(params.get("to") ?? "") ? params.get("to")! : rawFrom;
  const from = rawFrom <= rawTo ? rawFrom : rawTo;
  const to = rawFrom <= rawTo ? rawTo : rawFrom;
  const filterParam = params.get("filter");
  const filter = isSubmissionFilter(filterParam) ? filterParam : "all";
  const contractor = params.get("contractor") || ALL_CONTRACTORS;
  const search = params.get("q") ?? "";
  const current = useCurrentProject();
  const projectId = params.get("projectId") || current.projectId;

  const history = useReviewQueue(projectId, { from, to });
  const ids = useMemo(
    () =>
      filterSubmissions(history.data?.data ?? [], { filter, contractor, search })
        .map((r) => r.id)
        .filter((id): id is string => Boolean(id)),
    [history.data, filter, contractor, search],
  );
  const reports = usePrintReports(ids);
  const done = reports.filter((q) => q.data).length;
  const failed = reports.filter((q) => q.isError).length;
  const ready = Boolean(history.data) && done + failed === ids.length;
  const printed = useRef(false);

  useEffect(() => {
    if (!ready || printed.current || ids.length === 0) return;
    document.title = `Daily reports ${from}${from === to ? "" : `_${to}`}`;
    const imgs = Array.from(document.images);
    Promise.all(
      imgs.map((img) => (img.complete ? Promise.resolve() : new Promise((r) => { img.onload = img.onerror = () => r(null); }))),
    ).then(() => {
      printed.current = true;
      setTimeout(() => window.print(), 300);
    });
  }, [ready, ids.length, from, to]);

  if (history.isError) {
    return (
      <Stack alignItems="center" sx={{ py: 10 }}>
        <Typography color="error">โหลดข้อมูลไม่สำเร็จ — ไม่มีสิทธิ์เข้าถึงหรือการเชื่อมต่อขัดข้อง</Typography>
      </Stack>
    );
  }
  if (history.data && ids.length === 0) {
    return (
      <Stack alignItems="center" sx={{ py: 10 }}>
        <Typography>ไม่มีรายงานที่ส่งแล้วในช่วงและตัวกรองที่เลือก</Typography>
      </Stack>
    );
  }
  if (!ready) {
    return (
      <Stack alignItems="center" spacing={2} sx={{ py: 10 }}>
        <CircularProgress />
        <Typography>
          กำลังเตรียมรายงาน… {done}/{ids.length}
        </Typography>
      </Stack>
    );
  }

  return (
    <Box sx={{ bgcolor: "#fff", color: "#000", fontFamily: "'Inter', 'Sarabun', sans-serif" }}>
      <PrintStyles />
      <Stack direction="row" spacing={1} className="no-print" sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
        <Button onClick={() => window.print()}>Print / Save as PDF</Button>
        <Typography variant="body2" color="text.secondary" sx={{ alignSelf: "center" }}>
          {ids.length} รายงาน{failed > 0 ? ` · โหลดไม่สำเร็จ ${failed} รายงาน` : ""} — ในหน้าต่างพิมพ์ เลือก "Save as PDF"
        </Typography>
      </Stack>
      {reports.map((q) =>
        q.data ? (
          <Fragment key={q.data.data.id}>
            <ReportSheet r={q.data.data} />
          </Fragment>
        ) : null,
      )}
    </Box>
  );
}

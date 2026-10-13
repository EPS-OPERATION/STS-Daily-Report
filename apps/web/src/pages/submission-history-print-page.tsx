import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import dayjs from "dayjs";
import { useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ALL_CONTRACTORS,
  SUBMISSION_FILTER_LABELS,
  countSubmissions,
  filterSubmissions,
  formatThaiDate,
  isSubmissionFilter,
  rfiCountByDay,
  todayIso,
  useInspectionRequests,
  useReviewQueue,
} from "@/features/daily-reports/index.js";
import { useCurrentProject } from "@/features/projects/index.js";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const BLUE = "#dbe9f6";

// Printable Submission History (A4 portrait): the rows the /daily-reports history table shows for the
// same range + filter chip + contractor + search, with the four count boxes on top. Opens the print
// dialog once loaded — choose "Save as PDF". Outside the app shell.
export function SubmissionHistoryPrintPage() {
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
  // The tab opened from the page carries its project (the selector choice is not persisted).
  const projectId = params.get("projectId") || current.projectId;
  const projectName = current.projects.find((p) => p.id === projectId)?.name ?? "";

  const history = useReviewQueue(projectId, { from, to });
  const inspections = useInspectionRequests(projectId, { from, to, by: "report" });
  const printed = useRef(false);

  const queue = useMemo(() => history.data?.data ?? [], [history.data]);
  const counts = useMemo(() => countSubmissions(queue), [queue]);
  const rows = useMemo(() => filterSubmissions(queue, { filter, contractor, search }), [queue, filter, contractor, search]);
  const rfiByDay = useMemo(() => rfiCountByDay(inspections.data?.data ?? []), [inspections.data]);
  const ready = Boolean(history.data && inspections.data);

  useEffect(() => {
    if (!ready || printed.current) return;
    document.title = `Submission history ${from}${from === to ? "" : `_${to}`}`;
    const imgs = Array.from(document.images);
    Promise.all(imgs.map((img) => (img.complete ? Promise.resolve() : new Promise((r) => { img.onload = img.onerror = () => r(null); })))).then(() => {
      printed.current = true;
      setTimeout(() => window.print(), 300);
    });
  }, [ready, from, to]);

  if (history.isError || inspections.isError) {
    return (
      <Stack alignItems="center" sx={{ py: 10 }}>
        <Typography color="error">โหลดข้อมูลไม่สำเร็จ — ไม่มีสิทธิ์เข้าถึงหรือการเชื่อมต่อขัดข้อง</Typography>
      </Stack>
    );
  }
  if (!ready) {
    return (
      <Stack alignItems="center" spacing={2} sx={{ py: 10 }}>
        <CircularProgress />
        <Typography>กำลังเตรียมรายงาน…</Typography>
      </Stack>
    );
  }

  const rangeLabel = from === to ? formatThaiDate(from) : `${formatThaiDate(from)} – ${formatThaiDate(to)}`;
  const pct = (n: number) => (counts.all > 0 ? `${Math.round((n / counts.all) * 100)}%` : "—");
  const conditions = [
    `สถานะ: ${SUBMISSION_FILTER_LABELS[filter]}`,
    contractor !== ALL_CONTRACTORS ? `ผู้รับเหมา: ${contractor}` : "ทุกผู้รับเหมา",
    search.trim() ? `ค้นหา: "${search.trim()}"` : null,
  ].filter(Boolean);
  const sentLabel = (s: string) => (s === "submitted" ? <span className="ok">ส่งแล้ว</span> : <span className="no">ยังไม่ส่ง</span>);

  return (
    <Box sx={{ bgcolor: "#fff", color: "#000", fontFamily: "'Inter', 'Sarabun', sans-serif" }}>
      <style>{`
        @page { size: A4 portrait; margin: 10mm; }
        @media print { .no-print { display: none !important; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        .sheet { font-size: 10px; line-height: 1.3; }
        .f { width: 100%; border-collapse: collapse; }
        .f td, .f th { border: 1px solid #222; padding: 3px 5px; vertical-align: middle; }
        .f th { background: ${BLUE}; font-weight: 700; text-align: center; }
        .f thead { display: table-header-group; }
        .f tr { break-inside: avoid; }
        .c { text-align: center; } .r { text-align: right; font-variant-numeric: tabular-nums; }
        .ok { color: #127a2b; font-weight: 700; } .no { color: #b42318; }
        .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin: 8px 0; }
        .kpi { border: 1px solid #222; padding: 4px 6px; }
        .kpi .v { font-size: 14px; font-weight: 800; }
      `}</style>

      <Stack direction="row" spacing={1} className="no-print" sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
        <Button onClick={() => window.print()}>พิมพ์ / บันทึกเป็น PDF</Button>
        <Typography variant="body2" color="text.secondary" sx={{ alignSelf: "center" }}>
          ในหน้าต่างพิมพ์ เลือก "Save as PDF" / "บันทึกเป็น PDF"
        </Typography>
      </Stack>

      <Box className="sheet" sx={{ p: { xs: 1, print: 0 } }}>
        <Stack direction="row" alignItems="center" spacing={2}>
          {/* logo-eps.png is a 447px square with the mark at x52–388, y184–260: crop the padding. */}
          <div style={{ width: 160, height: 36, overflow: "hidden", position: "relative", flexShrink: 0 }}>
            <img src="/brand/logo-eps.png" alt="EPS" style={{ position: "absolute", width: 213, height: 213, left: -25, top: -88 }} />
          </div>
          <Box sx={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 800 }}>ประวัติการส่งรายงานประจำวัน (Submission History)</div>
            <div>
              {projectName ? `${projectName} · ` : ""}
              {rangeLabel}
            </div>
          </Box>
        </Stack>

        <div className="kpis">
          {[
            ["รายการทั้งหมด (ผู้รับเหมา × วัน)", counts.all, ""],
            ["ส่งครบทั้ง 2 รายงาน", counts.complete, pct(counts.complete)],
            ["ส่งบางส่วน", counts.partial, pct(counts.partial)],
            ["ยังไม่ส่ง", counts.none, pct(counts.none)],
          ].map(([label, value, sub]) => (
            <div key={label} className="kpi">
              <div>{label}</div>
              <div className="v">
                {value} รายการ {sub ? <span style={{ fontSize: 10, fontWeight: 400 }}>({sub})</span> : null}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: 4 }}>
          {conditions.join(" · ")} — แสดง {rows.length} จาก {queue.length} รายการ
        </div>

        <table className="f">
          <thead>
            <tr>
              <th style={{ width: 28 }}>#</th>
              <th style={{ width: 90 }}>วันที่</th>
              <th>ผู้รับเหมา</th>
              <th style={{ width: 78 }}>Daily Report</th>
              <th style={{ width: 78 }}>Daily Request</th>
              <th style={{ width: 44 }}>คน</th>
              <th style={{ width: 36 }}>RFI</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const people = r.totalHeadcount || r.eveningHeadcount;
              return (
                <tr key={`${r.contractorId}-${r.reportDate}`}>
                  <td className="c">{i + 1}</td>
                  <td>{dayjs(r.reportDate).format("ddd D MMM YY")}</td>
                  <td>
                    <b>{r.contractorCode}</b> {r.contractorName}
                  </td>
                  <td className="c">{sentLabel(r.morningStatus)}</td>
                  <td className="c">{sentLabel(r.eveningStatus)}</td>
                  <td className="r">{people > 0 ? people : "—"}</td>
                  <td className="r">{rfiByDay.get(`${r.contractorId}|${r.reportDate}`) ?? 0}</td>
                </tr>
              );
            })}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="c">
                  ไม่มีรายการที่ตรงกับเงื่อนไข
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>

        <div style={{ marginTop: 6, fontSize: 8, color: "#555", textAlign: "right" }}>
          พิมพ์เมื่อ {dayjs().format("D/M/YYYY HH:mm")} · STS Daily Report
        </div>
      </Box>
    </Box>
  );
}

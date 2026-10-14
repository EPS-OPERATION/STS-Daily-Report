import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import dayjs from "dayjs";
import { useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ALL_BUILDINGS,
  ALL_CONTRACTORS,
  filterWorkDone,
  todayIso,
  useReviewQueue,
  workDoneItemsFromSiteDay,
  type ReviewQueueRow,
  type WorkDoneItem,
} from "@/features/daily-reports/index.js";
import { useCurrentProject } from "@/features/projects/index.js";
import { useSiteDay } from "@/features/site-plan/index.js";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
import { PRINT_BLUE } from "@/components/print/print-tokens.js";
const BLUE = PRINT_BLUE;
const MIN_ROWS = 25; // paper form has 25 numbered lines

// Buddhist-era date as on the paper forms (12/10/69).
const thaiShortDate = (iso: string) => {
  const d = dayjs(iso);
  return `${d.date()}/${d.month() + 1}/${String(d.year() + 543).slice(-2)}`;
};
const pct = (n: number | null) => (n === null ? "-" : `${n.toFixed(2)}%`);

// Printable Work Done report (A4 portrait, one sheet per day): every Today Activity the table shows
// for the same range + contractor + building + search, Plan vs Actual, and the EPC / Owner Engineer
// signature block left blank for wet signatures. Opens the print dialog — choose "Save as PDF".
export function WorkDonePrintPage() {
  const [params] = useSearchParams();
  const rawFrom = ISO_DATE.test(params.get("from") ?? "") ? params.get("from")! : todayIso();
  const rawTo = ISO_DATE.test(params.get("to") ?? "") ? params.get("to")! : rawFrom;
  const from = rawFrom <= rawTo ? rawFrom : rawTo;
  const to = rawFrom <= rawTo ? rawTo : rawFrom;
  const contractor = params.get("contractor") || ALL_CONTRACTORS;
  const building = params.get("building") || ALL_BUILDINGS;
  const search = params.get("q") ?? "";

  const current = useCurrentProject();
  const projectId = params.get("projectId") || current.projectId;
  const projectName = current.projects.find((p) => p.id === projectId)?.name ?? "";
  const siteDay = useSiteDay(projectId, from, to);
  const reports = useReviewQueue(projectId, { from, to });
  const printed = useRef(false);

  const days = useMemo(() => {
    const items = filterWorkDone(workDoneItemsFromSiteDay(siteDay.data?.data?.buildings ?? []), { contractor, building, search });
    const byDay = new Map<string, WorkDoneItem[]>();
    for (const it of items) byDay.set(it.reportDate, [...(byDay.get(it.reportDate) ?? []), it]);
    return [...byDay]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, rows]) => ({
        date,
        rows: rows.sort((a, b) => a.contractorCode.localeCompare(b.contractorCode) || a.buildingName.localeCompare(b.buildingName)),
      }));
  }, [siteDay.data, contractor, building, search]);

  const ready = Boolean(siteDay.data && reports.data);

  useEffect(() => {
    if (!ready || printed.current || days.length === 0) return;
    document.title = `Work done ${from}${from === to ? "" : `_${to}`}`;
    const imgs = Array.from(document.images);
    Promise.all(imgs.map((img) => (img.complete ? Promise.resolve() : new Promise((r) => { img.onload = img.onerror = () => r(null); })))).then(() => {
      printed.current = true;
      setTimeout(() => window.print(), 300);
    });
  }, [ready, days.length, from, to]);

  if (siteDay.isError || reports.isError) {
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
  if (days.length === 0) {
    return (
      <Stack alignItems="center" sx={{ py: 10 }}>
        <Typography>ไม่มีรายการเนื้องานในช่วงและตัวกรองที่เลือก</Typography>
      </Stack>
    );
  }

  const queue = reports.data?.data ?? [];
  return (
    <Box sx={{ bgcolor: "#fff", color: "#000", fontFamily: "'Inter', 'Sarabun', sans-serif" }}>
      <style>{`
        @page { size: A4 portrait; margin: 8mm; }
        @media print { .no-print { display: none !important; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        .sheet { break-after: page; font-size: 10px; line-height: 1.25; padding: 4px; }
        .sheet:last-child { break-after: auto; }
        .f { width: 100%; border-collapse: collapse; table-layout: fixed; }
        .f td, .f th { border: 1px solid #222; padding: 2px 5px; vertical-align: middle; overflow-wrap: anywhere; }
        .f th { background: ${BLUE}; font-weight: 700; text-align: center; }
        .f thead { display: table-header-group; }
        .f tr { break-inside: avoid; }
        .c { text-align: center; } .r { text-align: right; font-variant-numeric: tabular-nums; } .b { font-weight: 700; }
        .sub { display: block; font-size: 8px; font-weight: 400; color: #333; }
      `}</style>

      <Stack direction="row" spacing={1} className="no-print" sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
        <Button onClick={() => window.print()}>Print / Save as PDF</Button>
        <Typography variant="body2" color="text.secondary" sx={{ alignSelf: "center" }}>
          {days.length} วัน ({days.length} แผ่น) — ในหน้าต่างพิมพ์ เลือก "Save as PDF"
        </Typography>
      </Stack>

      {days.map(({ date, rows }) => (
        <DaySheet key={date} date={date} rows={rows} reports={queue} projectName={projectName} />
      ))}
    </Box>
  );
}

function DaySheet({ date, rows, reports, projectName }: { date: string; rows: WorkDoneItem[]; reports: ReviewQueueRow[]; projectName: string }) {
  // Header summary from the reports of the contractors on this sheet.
  const codes = new Set(rows.map((r) => r.contractorCode));
  const day = reports.filter((r) => r.reportDate === date && r.hasReport && codes.has(r.contractorCode));
  const starts = day.map((r) => r.startTime).filter((t): t is string => Boolean(t)).sort();
  const ends = day.map((r) => r.endTime).filter((t): t is string => Boolean(t)).sort();
  const hours = Math.max(0, ...day.map((r) => r.workHours ?? 0));
  const ot = Math.max(0, ...day.map((r) => r.otHours ?? 0));
  const manpower = day.reduce((s, r) => s + (r.totalHeadcount || r.eveningHeadcount), 0);
  const lines = Array.from({ length: Math.max(MIN_ROWS, rows.length) }, (_, i) => rows[i] ?? null);

  return (
    <Box className="sheet">
      <table className="f">
        <tbody>
          <tr>
            <td style={{ width: "24%" }} rowSpan={2}>
              {/* logo-eps.png is a 447px square with the mark at x52–388, y184–260: crop the padding. */}
              <div style={{ width: 170, height: 38, overflow: "hidden", position: "relative" }}>
                <img src="/brand/logo-eps.png" alt="EPS" style={{ position: "absolute", width: 226, height: 226, left: -26, top: -93 }} />
              </div>
              <div style={{ fontSize: 8 }}>บริษัทอีโค่ แพลนท์ เซอร์วิสเซส จำกัด</div>
            </td>
            <td className="c b" style={{ fontSize: 14, background: BLUE }} rowSpan={2}>
              รายงานผลงานประจำวัน
              <span className="sub" style={{ fontSize: 10 }}>(Daily Work Done Report)</span>
            </td>
            <td style={{ width: "26%" }}>
              Date: <b>{thaiShortDate(date)}</b> ({dayjs(date).format("ddd D MMM YYYY")})
            </td>
          </tr>
          <tr>
            <td>Project: {projectName || "-"}</td>
          </tr>
        </tbody>
      </table>
      <table className="f" style={{ marginTop: -1 }}>
        <tbody>
          <tr>
            <td>Time start: <b>{starts[0] ?? "-"}</b></td>
            <td>Time finish: <b>{ends.at(-1) ?? "-"}</b></td>
            <td>Working time: <b>{hours || "-"}</b> hr.</td>
            <td>OT: <b>{ot || "-"}</b> hr.</td>
            <td>Manpower: <b>{manpower || "-"}</b> คน</td>
            <td>ผู้รับเหมา: <b>{codes.size}</b> ราย</td>
          </tr>
        </tbody>
      </table>

      <table className="f" style={{ marginTop: 4 }}>
        <colgroup>
          <col style={{ width: 44 }} />
          <col />
          <col style={{ width: 72 }} />
          <col style={{ width: 72 }} />
        </colgroup>
        <thead>
          <tr>
            <th rowSpan={2}>
              Items/<span className="sub">ลำดับที่</span>
            </th>
            <th rowSpan={2}>Description of work done</th>
            <th colSpan={2}>Qty of Works</th>
          </tr>
          <tr>
            <th>
              Plan<span className="sub">แผนงาน</span>
            </th>
            <th>
              Actual<span className="sub">ทำได้จริง</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {lines.map((r, i) => (
            <tr key={r?.id ?? `blank-${i}`} style={{ height: 17 }}>
              <td className="c">{i + 1}</td>
              <td>{r ? `[${r.contractorCode}] ${r.workDescription} บริเวณ ${r.buildingName}` : ""}</td>
              <td className="r">{r ? pct(r.planPercent) : ""}</td>
              <td className="r" style={{ color: r && r.planPercent !== null && r.actualPercent !== null && r.actualPercent < r.planPercent ? "#b45309" : undefined }}>
                {r ? pct(r.actualPercent) : ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Signatures: left blank for wet signatures */}
      <table className="f" style={{ marginTop: -1, breakInside: "avoid" }}>
        <tbody>
          <tr>
            <td colSpan={2} className="c b" style={{ background: BLUE }}>
              EPC
            </td>
            <td className="c b" style={{ background: BLUE }}>
              OWNER ENGINEER
            </td>
          </tr>
          <tr>
            <td className="b">PREPARED BY : EPS</td>
            <td className="b">CHECKED BY : EPS</td>
            <td className="b">APPROVED BY :</td>
          </tr>
          <tr style={{ height: 46 }}>
            {[0, 1, 2].map((k) => (
              <td key={k} style={{ verticalAlign: "bottom" }}>
                Signature ..........................................
                <br />
                Name ...............................................
              </td>
            ))}
          </tr>
        </tbody>
      </table>
      <div style={{ fontSize: 8, textAlign: "right", color: "#555", marginTop: 2 }}>STS Daily Report · พิมพ์เมื่อ {dayjs().format("D/M/YYYY HH:mm")}</div>
    </Box>
  );
}

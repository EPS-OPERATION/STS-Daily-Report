import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import dayjs from "dayjs";
import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { contractorColorMap, todayIso } from "@/features/daily-reports/index.js";
import { useCurrentProject } from "@/features/projects/index.js";
import { FindingPie, StatisticTable, periodLabel, useSafetyFindings, useSafetyStats } from "@/features/safety/index.js";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const YELLOW = "#fff5b8";

// Printable EPS safety report (A4 landscape). Opens the browser print dialog once
// data and photos have loaded — choose "Save as PDF". Outside the app shell.
export function SafetyReportPrintPage() {
  const [params] = useSearchParams();
  const from = ISO_DATE.test(params.get("from") ?? "") ? params.get("from")! : todayIso();
  const to = ISO_DATE.test(params.get("to") ?? "") ? params.get("to")! : from;
  const { projectId } = useCurrentProject();
  const stats = useSafetyStats(projectId, from, to);
  const findings = useSafetyFindings(projectId, from, to);
  const printed = useRef(false);

  const s = stats.data?.data;
  const rows = findings.data?.data ?? [];
  const ready = Boolean(s && findings.data);
  const period = periodLabel(from, to);
  const colors = contractorColorMap(rows.map((r) => r.contractorCode ?? "ไม่ระบุ"));

  useEffect(() => {
    if (!ready || printed.current) return;
    document.title = `Safety report ${from}${from === to ? "" : `_${to}`}`;
    // Wait for every image (logos + photos) before printing.
    const imgs = Array.from(document.images);
    Promise.all(imgs.map((img) => (img.complete ? Promise.resolve() : new Promise((r) => { img.onload = img.onerror = () => r(null); })))).then(() => {
      printed.current = true;
      setTimeout(() => window.print(), 300);
    });
  }, [ready, from, to]);

  if (!ready || !s) {
    return (
      <Stack alignItems="center" spacing={2} sx={{ py: 10 }}>
        <CircularProgress />
        <Typography>กำลังเตรียมรายงาน…</Typography>
      </Stack>
    );
  }

  return (
    <Box sx={{ bgcolor: "#fff", color: "#000", fontFamily: "'Noto Sans Thai', 'Inter', sans-serif" }}>
      <style>{`
        @page { size: A4 landscape; margin: 10mm; }
        @media print { .no-print { display: none !important; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        .sheet { break-after: page; padding: 4mm 2mm; }
        .sheet:last-child { break-after: auto; }
        .lw { width: 100%; border-collapse: collapse; font-size: 11px; }
        .lw th, .lw td { border: 1px solid #333; padding: 4px; vertical-align: middle; }
        .lw th { background: ${YELLOW}; font-weight: 700; text-align: center; }
        .lw tr { break-inside: avoid; }
        .lw img { width: 150px; height: 108px; object-fit: cover; display: block; margin: 0 auto; }
      `}</style>

      <Stack direction="row" spacing={1} className="no-print" sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
        <Button onClick={() => window.print()}>พิมพ์ / บันทึกเป็น PDF</Button>
        <Typography variant="body2" color="text.secondary" sx={{ alignSelf: "center" }}>
          ในหน้าต่างพิมพ์ เลือก "Save as PDF" / "บันทึกเป็น PDF"
        </Typography>
      </Stack>

      {/* Page 1..n: Issue Safety Line Walk */}
      <Box className="sheet">
        <Header subtitle="Issue Safety Line Walk" period={period} />
        <table className="lw">
          <thead>
            <tr>
              <th style={{ width: 34 }}>item no.</th>
              <th>Observations Identified</th>
              <th style={{ width: 60 }}>Location</th>
              <th>Action to be taken</th>
              <th style={{ width: 80 }}>Responsible Supervisor</th>
              <th style={{ width: 62 }}>Inspection date</th>
              <th style={{ width: 62 }}>Expect Complete date</th>
              <th style={{ width: 160 }}>Finding Picture</th>
              <th style={{ width: 48 }}>Status</th>
              <th style={{ width: 160 }}>Close Picture</th>
              <th style={{ width: 66 }}>Type</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={11} style={{ textAlign: "center", padding: 24 }}>
                  ไม่มี Line walk ในช่วงนี้
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id}>
                  <td style={{ textAlign: "center" }}>{r.itemNo}</td>
                  <td style={{ verticalAlign: "top" }}>{r.observation}</td>
                  <td style={{ textAlign: "center" }}>
                    {r.buildingCode ?? "-"}
                    {r.locationDetail ? <div style={{ fontSize: 9 }}>{r.locationDetail}</div> : null}
                  </td>
                  <td style={{ verticalAlign: "top" }}>{r.actionToBeTaken}</td>
                  <td style={{ textAlign: "center" }}>{r.contractorName ?? r.contractorCode ?? "-"}</td>
                  <td style={{ textAlign: "center" }}>{dayjs(r.inspectionDate).format("D/MMM/YY")}</td>
                  <td style={{ textAlign: "center" }}>{r.expectedCompleteDate ? dayjs(r.expectedCompleteDate).format("D/MMM/YY") : "-"}</td>
                  <td>{r.findingPhotoUrl ? <img src={r.findingPhotoUrl} alt="" /> : null}</td>
                  <td style={{ textAlign: "center", fontWeight: 700 }}>{r.status === "done" ? "DONE" : "OPEN"}</td>
                  <td>{r.closePhotoUrl ? <img src={r.closePhotoUrl} alt="" /> : null}</td>
                  <td style={{ textAlign: "center" }}>{r.findingType === "unsafe_act" ? "Unsafe Act." : "Unsafe con."}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Box>

      {/* Last page: Safety Weekly Report */}
      <Box className="sheet">
        <Typography sx={{ color: "#1a33c8", fontWeight: 700, fontSize: 14, mb: 1 }}>
          SAFETY WEEKLY REPORT STS-9.9 MW. BIOMASS POWER PLANT PROJECT <span style={{ color: "#d61f1f" }}>({period})</span>
        </Typography>
        <Stack direction="row" spacing={3} alignItems="flex-start">
          <Box sx={{ flex: "0 0 52%" }}>
            <Typography sx={{ color: "#127a2b", fontWeight: 800, fontSize: 20, textAlign: "center", mb: 0.5 }}>STATISTIC</Typography>
            <StatisticTable stats={s} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <FindingPie title="Unsafe Action" summary={s.unsafeAct} colors={colors} size={190} />
            <Box sx={{ mt: 1 }}>
              <FindingPie title="Unsafe Condition" summary={s.unsafeCondition} colors={colors} size={190} />
            </Box>
            <Typography sx={{ textAlign: "center", fontWeight: 700, mt: 1 }}>Finding for line walk in this period</Typography>
          </Box>
        </Stack>
      </Box>
    </Box>
  );
}

function Header({ subtitle, period }: { subtitle: string; period: string }) {
  return (
    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
      <img src="/brand/logo-scg.png" alt="SCG" style={{ height: 44 }} />
      <Box sx={{ textAlign: "center", fontWeight: 700, lineHeight: 1.4, fontSize: 14 }}>
        <div>ECO PLANT SERVICES</div>
        <div>STS - 9.9 MW. BIOMASS POWER PLANT PROJECT</div>
        <div>{subtitle}</div>
        <div style={{ fontWeight: 400, fontSize: 12 }}>{period}</div>
      </Box>
      <img src="/brand/logo-eps.png" alt="EPS" style={{ height: 40 }} />
    </Stack>
  );
}

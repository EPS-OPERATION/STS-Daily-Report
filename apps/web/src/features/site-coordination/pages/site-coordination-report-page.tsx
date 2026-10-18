import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import PrintOutlined from "@mui/icons-material/PrintOutlined";
import { coordinationToday } from "@sts/shared";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useCurrentProject } from "@/features/projects/index.js";
import { CoordinationReportDocument, REPORT_STYLES, useCoordinationReport } from "@/features/site-coordination/index.js";
import { HttpError } from "@/services/http/client.js";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// Printable EPS day report (A4 landscape): the map with every job on it, then the job list.
// Outside the app shell; EPS-only by router guard, and the API checks again. The map's "รายงาน PDF"
// button opens it with print=1, which opens the print dialog once the map is drawn (choose "Save as PDF").
export function SiteCoordinationReportPage() {
  const [params] = useSearchParams();
  const { projectId: currentProjectId } = useCurrentProject();
  const projectId = params.get("projectId") || currentProjectId;
  const date = ISO_DATE.test(params.get("date") ?? "") ? params.get("date")! : coordinationToday();
  const autoPrint = params.get("print") === "1";
  const report = useCoordinationReport(projectId, date);
  const [fontsReady, setFontsReady] = useState(false);
  const [snapshot, setSnapshot] = useState<string | null>(null);
  const printed = useRef(false);
  const data = report.data?.data;
  const ready = Boolean(data) && snapshot !== null;

  useEffect(() => {
    // The map text is drawn with the app fonts, so the canvas waits for them.
    Promise.all([document.fonts.load("700 13px Inter"), document.fonts.load("600 12px Inter"), document.fonts.load("400 11px Inter")])
      .catch(() => undefined)
      .finally(() => setFontsReady(true));
  }, []);
  useEffect(() => { document.title = `Daily site map ${date}`; }, [date]);
  useEffect(() => {
    if (!autoPrint || !ready || printed.current) return;
    printed.current = true;
    const pending = Array.from(document.images).map((img) => (img.complete ? Promise.resolve() : new Promise((done) => { img.onload = img.onerror = () => done(null); })));
    void Promise.all(pending).then(() => window.setTimeout(() => window.print(), 300));
  }, [autoPrint, ready]);

  if (!projectId) return <Stack alignItems="center" sx={{ py: 10 }}><Typography>ยังไม่มีโครงการ</Typography></Stack>;
  if (report.isError) {
    const forbidden = report.error instanceof HttpError && report.error.status === 403;
    return (
      <Stack alignItems="center" sx={{ py: 10 }}>
        <Typography color="error">{forbidden ? "รายงานนี้สำหรับทีม EPS เท่านั้น" : "โหลดรายงานไม่สำเร็จ — ตรวจการเชื่อมต่อแล้วลองใหม่"}</Typography>
      </Stack>
    );
  }
  if (!data || !fontsReady) {
    return (
      <Stack alignItems="center" spacing={2} sx={{ py: 10 }}>
        <CircularProgress />
        <Typography>กำลังเตรียมรายงาน…</Typography>
      </Stack>
    );
  }

  return (
    <Box>
      <style>{REPORT_STYLES}</style>
      <Stack className="rpt-noprint" direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap
        sx={{ position: "sticky", top: 0, zIndex: 10, px: 2, py: 1.25, bgcolor: "background.paper", borderBottom: 1, borderColor: "divider" }}>
        <Button variant="contained" disableElevation startIcon={<PrintOutlined />} disabled={!ready} onClick={() => window.print()}>
          พิมพ์ / บันทึกเป็น PDF
        </Button>
        <Typography variant="body2" color="text.secondary">
          {ready ? `${data.items.length} งาน · ในหน้าต่างพิมพ์ เลือก "Save as PDF" (A4 แนวนอน)` : "กำลังวาดผัง…"}
        </Typography>
      </Stack>
      <CoordinationReportDocument report={data} snapshot={snapshot} onSnapshot={setSnapshot} />
    </Box>
  );
}

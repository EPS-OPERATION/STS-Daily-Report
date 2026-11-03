import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { PERMIT_TYPES, POSITIONS } from "@sts/shared";
import { ISO_DATE, PrintStyles } from "../components/print-shared.js";
import { useManpowerSummary, usePositionMix } from "@/features/report-summaries/index.js";
import { useMachineSummary } from "@/features/daily-requests/index.js";
import { useSiteDay } from "@/features/site-plan/index.js";
import { ContractorMapPages } from "@/features/site-coordination/index.js";
import { useCurrentProject } from "@/features/projects/index.js";
import { formatThaiDate, timeWindowLabel, todayIso } from "@/lib/dates.js";

const positionLabel = (code: string) => POSITIONS.find((p) => p.code === code)?.label ?? code;
const permitLabel = (code: string) => PERMIT_TYPES.find((p) => p.code === code)?.label ?? code;
const nf = (n: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(n);

// Whole-site daily report (A4 portrait): one day, every contractor together — manpower, machines, work by
// building, tomorrow's requests + safety, and the coordination map. Opens the print dialog once everything
// (incl. the map snapshot) is ready; choose "Save as PDF". Built from the same aggregated endpoints the EPS
// dashboards use.
export function SiteDailyReportPage() {
  const [params] = useSearchParams();
  const current = useCurrentProject();
  const projectId = params.get("projectId") || current.projectId;
  const project = current.projects.find((p) => p.id === projectId);
  const date = ISO_DATE.test(params.get("date") ?? "") ? params.get("date")! : todayIso();

  const manpower = useManpowerSummary(projectId, date, date);
  const positions = usePositionMix(projectId, date, date);
  const machines = useMachineSummary(projectId, date, date);
  const siteDay = useSiteDay(projectId, date, date);
  const [mapsReady, setMapsReady] = useState(false);
  const printed = useRef(false);

  const man = manpower.data?.data;
  const buildings = useMemo(() => (siteDay.data?.data.buildings ?? []).filter((b) => b.activities.length > 0), [siteDay.data]);
  const positionTotals = useMemo(() => {
    const byPos = new Map<string, number>();
    for (const r of positions.data?.data ?? []) byPos.set(r.position, (byPos.get(r.position) ?? 0) + (r.totalHeadcount ?? 0));
    return [...byPos].map(([code, total]) => ({ code, total })).filter((p) => p.total > 0).sort((a, b) => b.total - a.total);
  }, [positions.data]);
  // Site-wide requests + safety, flattened from the per-building site-day data.
  const flat = useMemo(() => {
    const all = siteDay.data?.data.buildings ?? [];
    const place = (code: string, name: string | null) => `${code}${name ? ` ${name}` : ""}`;
    return {
      permits: all.flatMap((b) => b.permits.map((p) => ({ building: place(b.code, b.nameTh ?? b.name), type: p.permitType, workers: p.workers }))),
      roads: all.flatMap((b) => b.roads.map((r) => ({ building: place(b.code, b.nameTh ?? b.name), ...r }))),
      qaqc: all.flatMap((b) => b.inspections.map((i) => ({ building: place(b.code, b.nameTh ?? b.name), type: i.inspectionType, contractor: i.contractorCode, work: i.workItem }))),
    };
  }, [siteDay.data]);

  // Machines reported on site (morning) grouped by contractor, plus the day's machine bookings.
  const machineRows = useMemo(() => {
    const byContractor = new Map<string, { code: string; items: Map<string, number>; total: number }>();
    for (const m of machines.data?.onSite ?? []) {
      const c = byContractor.get(m.contractorCode) ?? { code: m.contractorCode, items: new Map(), total: 0 };
      c.items.set(m.equipmentType, (c.items.get(m.equipmentType) ?? 0) + m.qty);
      c.total += m.qty;
      byContractor.set(m.contractorCode, c);
    }
    const rows = [...byContractor.values()].sort((a, b) => b.total - a.total || a.code.localeCompare(b.code));
    const bookings = [...(machines.data?.bookings ?? [])].sort(
      (a, b) => a.buildingCode.localeCompare(b.buildingCode) || (a.startTime ?? "").localeCompare(b.startTime ?? ""),
    );
    return { rows, total: rows.reduce((s, c) => s + c.total, 0), bookings };
  }, [machines.data]);

  const dataReady = Boolean(man && siteDay.data && positions.data && machines.data);
  const ready = dataReady && mapsReady;

  useEffect(() => { document.title = `Site daily report ${date}`; }, [date]);
  useEffect(() => {
    if (!ready || printed.current) return;
    printed.current = true;
    const imgs = Array.from(document.images);
    Promise.all(imgs.map((img) => (img.complete ? Promise.resolve() : new Promise((r) => { img.onload = img.onerror = () => r(null); }))))
      .then(() => setTimeout(() => window.print(), 300));
  }, [ready]);

  if (!projectId) return <Stack alignItems="center" sx={{ py: 10 }}><Typography>ยังไม่มีโครงการ</Typography></Stack>;
  if (manpower.isError || siteDay.isError || positions.isError || machines.isError) {
    return <Stack alignItems="center" sx={{ py: 10 }}><Typography color="error">โหลดข้อมูลไม่สำเร็จ — ตรวจการเชื่อมต่อแล้วลองใหม่</Typography></Stack>;
  }
  if (!dataReady) {
    return <Stack alignItems="center" spacing={2} sx={{ py: 10 }}><CircularProgress /><Typography>กำลังเตรียมรายงาน…</Typography></Stack>;
  }

  const t = man!.totals;
  return (
    <Box sx={{ bgcolor: "#fff", color: "#000", fontFamily: "'Inter', 'Sarabun', sans-serif" }}>
      <PrintStyles />
      <style>{`
        .sdr-head { display: flex; align-items: center; gap: 12px; border-bottom: 2px solid #0B4D8B; padding-bottom: 6px; margin-bottom: 10px; }
        .sdr-logo { width: 150px; height: 34px; overflow: hidden; position: relative; flex-shrink: 0; }
        .sdr-logo img { position: absolute; width: 200px; height: 200px; left: -24px; top: -83px; }
        .sdr-title { font-size: 19px; font-weight: 700; color: #0B4D8B; }
        .sdr-meta { font-size: 11px; color: #333; }
        .sdr-kpis { display: flex; gap: 8px; margin-bottom: 12px; }
        .sdr-kpi { flex: 1; border: 1px solid #0B4D8B; border-radius: 6px; padding: 6px 10px; }
        .sdr-kpi b { font-size: 20px; display: block; color: #0B4D8B; }
        .sdr-kpi span { font-size: 10px; color: #555; }
        h3.sdr { font-size: 13px; color: #0B4D8B; border-bottom: 1.2px solid #0B4D8B; margin: 14px 0 5px; break-after: avoid; }
        .f td.r, .f th.r { text-align: right; }
      `}</style>

      <Stack direction="row" spacing={1} className="no-print" sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
        <Button onClick={() => window.print()}>Print / Save as PDF</Button>
        <Typography variant="body2" color="text.secondary" sx={{ alignSelf: "center" }}>ในหน้าต่างพิมพ์ เลือก "Save as PDF" / "บันทึกเป็น PDF"</Typography>
      </Stack>

      <Box className="sheet">
        <div className="sdr-head">
          <div className="sdr-logo"><img src="/brand/logo-eps.png" alt="EPS" /></div>
          <div style={{ flex: 1 }}>
            <div className="sdr-title">Site Daily Report · สรุปรายงานประจำวันทั้งไซต์</div>
            <div className="sdr-meta">{project?.name ?? "STS Biomass Power Plant"} · วันที่ {formatThaiDate(date)} · รวมทุกผู้รับเหมา ({man!.contractors.length} ราย)</div>
          </div>
        </div>

        <div className="sdr-kpis">
          <div className="sdr-kpi"><b>{nf(t.manDays)}</b><span>Man-day รวม</span></div>
          <div className="sdr-kpi"><b>{nf(t.manHours)}</b><span>NMH (ชม.) · ปกติ {nf(t.normalManHours)} + OT {nf(t.otManHours)}</span></div>
          <div className="sdr-kpi"><b>{nf(t.avgDaily)}</b><span>เฉลี่ยคน/วัน</span></div>
          <div className="sdr-kpi"><b>{buildings.length}</b><span>อาคารที่มีงาน</span></div>
        </div>

        {/* Manpower by contractor */}
        <h3 className="sdr">กำลังคนแยกตามบริษัท (Manpower by contractor)</h3>
        <table className="f">
          <thead><tr><th>บริษัท</th><th className="r">Man-day</th><th className="r">NMH</th><th className="r">ไทย ช/ญ</th><th className="r">ต่างชาติ ช/ญ</th></tr></thead>
          <tbody>
            {man!.contractors.map((c) => (
              <tr key={c.contractorId}><td className="b">{c.contractorCode}</td><td className="r">{nf(c.manDays)}</td><td className="r">{nf(c.manHours)}</td>
                <td className="r">{c.thaiMale}/{c.thaiFemale}</td><td className="r">{c.foreignMale}/{c.foreignFemale}</td></tr>
            ))}
            <tr className="blue b"><td>รวม</td><td className="r">{nf(t.manDays)}</td><td className="r">{nf(t.manHours)}</td><td /><td /></tr>
          </tbody>
        </table>

        {/* Manpower by position */}
        {positionTotals.length > 0 ? (<>
          <h3 className="sdr">กำลังคนแยกตามตำแหน่ง (Manpower by position)</h3>
          <table className="f">
            <tbody>
              {Array.from({ length: Math.ceil(positionTotals.length / 2) }).map((_, i) => {
                const left = positionTotals[i * 2], right = positionTotals[i * 2 + 1];
                return <tr key={i}><td>{positionLabel(left!.code)}</td><td className="r b">{left!.total}</td>
                  <td>{right ? positionLabel(right.code) : ""}</td><td className="r b">{right ? right.total : ""}</td></tr>;
              })}
            </tbody>
          </table>
        </>) : null}

        {/* Machines on site (morning report), then the day's machine bookings */}
        <h3 className="sdr">เครื่องจักรในไซต์ (Machines on site)</h3>
        {machineRows.rows.length > 0 ? (
          <table className="f">
            <thead><tr><th>ผู้รับเหมา</th><th>เครื่องจักร / เครื่องมือ</th><th className="r">รวม (เครื่อง)</th></tr></thead>
            <tbody>
              {machineRows.rows.map((c) => (
                <tr key={c.code}><td className="b">{c.code}</td><td>{[...c.items].map(([type, qty]) => `${type} ×${qty}`).join(" · ")}</td><td className="r">{c.total}</td></tr>
              ))}
              <tr className="blue b"><td>รวม</td><td /><td className="r">{machineRows.total}</td></tr>
            </tbody>
          </table>
        ) : <p style={{ fontSize: 12, color: "#555" }}>วันนี้ไม่มีรายงานเครื่องจักรในไซต์</p>}
        {machineRows.bookings.length > 0 ? (
          <>
            <h3 className="sdr">เครื่องจักรที่ขอใช้ (Machine bookings)</h3>
            <table className="f">
              <thead><tr><th>อาคาร</th><th>ผู้รับเหมา</th><th>เครื่องจักร</th><th className="r">เวลา</th><th>งาน</th></tr></thead>
              <tbody>
                {machineRows.bookings.map((b) => (
                  <tr key={b.id}>
                    <td>{b.buildingCode} {b.buildingNameTh ?? b.buildingName}</td>
                    <td>{b.contractorCode}</td>
                    <td>{b.machineType}{b.unitTag ? ` (${b.unitTag})` : ""}</td>
                    <td className="r">{timeWindowLabel(b.startTime, b.endTime)}</td>
                    <td>{b.purpose ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : null}

        {/* Work by building */}
        <h3 className="sdr">เนื้องานรายอาคาร (Work by building)</h3>
        {buildings.length > 0 ? (
          <table className="f">
            <thead><tr><th style={{ width: "16%" }}>อาคาร</th><th>งาน</th><th>ผู้รับเหมา</th><th className="r">คน</th><th className="r">แผน%</th><th className="r">ทำได้%</th></tr></thead>
            <tbody>
              {buildings.flatMap((b) => b.activities.map((a, i) => (
                <tr key={`${b.id}-${i}`}>
                  <td>{i === 0 ? <b>{b.code} {b.nameTh ?? b.name}</b> : ""}</td>
                  <td>{a.workDescription}</td><td>{a.contractorCode}</td><td className="r">{a.headcount}</td>
                  <td className="r">{a.planPercent ?? "–"}</td><td className="r">{a.actualPercent ?? "–"}</td>
                </tr>
              )))}
            </tbody>
          </table>
        ) : <p style={{ fontSize: 12, color: "#555" }}>ยังไม่มีรายงานเนื้องานในวันนี้</p>}

        {/* Requests + safety */}
        <h3 className="sdr">คำขอ &amp; ความปลอดภัย (Requests &amp; safety)</h3>
        {flat.permits.length === 0 && flat.roads.length === 0 && flat.qaqc.length === 0 ? (
          <p style={{ fontSize: 12, color: "#555" }}>ไม่มีคำขอ/ใบอนุญาตในวันนี้</p>
        ) : (
          <Stack spacing={1}>
            {flat.permits.length > 0 ? (
              <table className="f"><thead><tr><th colSpan={3} className="blue">ใบอนุญาตงานเสี่ยง (Work Permits) · {flat.permits.length}</th></tr>
                <tr><th>อาคาร</th><th>ประเภท</th><th className="r">คน</th></tr></thead>
                <tbody>{flat.permits.map((p, i) => <tr key={i}><td>{p.building}</td><td>{permitLabel(p.type)}</td><td className="r">{p.workers}</td></tr>)}</tbody></table>
            ) : null}
            {flat.roads.length > 0 ? (
              <table className="f"><thead><tr><th colSpan={3} className="blue">ขอใช้/ปิดถนน (Road usage) · {flat.roads.length}</th></tr>
                <tr><th>เส้นทาง</th><th>อาคาร</th><th>เวลา</th></tr></thead>
                <tbody>{flat.roads.map((r, i) => <tr key={i}><td>{r.roadLocation}</td><td>{r.building}</td><td>{timeWindowLabel(r.startTime, r.endTime)}</td></tr>)}</tbody></table>
            ) : null}
            {flat.qaqc.length > 0 ? (
              <table className="f"><thead><tr><th colSpan={4} className="blue">ขอตรวจ QAQC · {flat.qaqc.length}</th></tr>
                <tr><th>อาคาร</th><th>ผู้รับเหมา</th><th>ประเภท</th><th>งาน</th></tr></thead>
                <tbody>{flat.qaqc.map((q, i) => <tr key={i}><td>{q.building}</td><td>{q.contractor}</td><td>{q.type}</td><td>{q.work}</td></tr>)}</tbody></table>
            ) : null}
          </Stack>
        )}
      </Box>

      {/* The coordination map for the whole site (every contractor), drawn as a snapshot. */}
      <ContractorMapPages projectId={projectId} date={date} onReady={() => setMapsReady(true)} subtitle="รวมทุกผู้รับเหมา" />
    </Box>
  );
}

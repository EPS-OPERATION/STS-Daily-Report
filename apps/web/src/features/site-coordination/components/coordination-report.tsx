import type { CoordinationReport } from "@sts/shared";
import { coordinationToday } from "@sts/shared";
import { useMemo } from "react";
import { formatThaiDate } from "@/lib/dates.js";
import { ICON_LABELS } from "../types/icon-labels.js";
import { CoordinationCanvas } from "./coordination-canvas.js";

// Drawing height on the A4 landscape sheet (277mm wide): 560px ≈ 148mm, the rest is header and footer.
const MAP_HEIGHT = 560;
// The map is printed from a 3× snapshot of the stage, so it stays sharp on paper whatever the screen density.
const SNAPSHOT_RATIO = 3;
const noop = () => undefined;

const timeOf = (iso: string) => `${new Intl.DateTimeFormat("th-TH", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" }).format(new Date(iso))} น.`;
const stampOf = (iso: string) => `${formatThaiDate(coordinationToday(new Date(iso)))} ${timeOf(iso)}`;

// Sheets are 277mm wide on screen and in print, so the map frame (and its snapshot) keeps one size.
export const REPORT_STYLES = `
  @page { size: A4 landscape; margin: 10mm; }
  .rpt { padding: 16px; overflow-x: auto; background: #e7ebf0; color: #111827; font-family: 'Inter', 'Sarabun', sans-serif; }
  .rpt * { box-sizing: border-box; }
  .rpt-sheet { width: calc(277mm + 24px); margin: 0 auto 16px; padding: 12px; background: #fff; display: flex; flex-direction: column; }
  .rpt-map-sheet { min-height: calc(190mm + 24px); }
  .rpt-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; padding-bottom: 8px; border-bottom: 1.5px solid #0b4d8b; }
  .rpt-head h1, .rpt-head h2 { margin: 0; font-size: 20px; line-height: 1.25; font-weight: 700; color: #0b4d8b; }
  .rpt-meta { margin: 4px 0 0; font-size: 12px; color: #475569; font-variant-numeric: tabular-nums; }
  .rpt-frame { position: relative; height: ${MAP_HEIGHT}px; margin: 12px 0; overflow: hidden; outline: 1px solid #cbd5e1; outline-offset: -1px; }
  .rpt-frame img { display: block; width: 100%; height: 100%; }
  .rpt-error { margin: 0; padding: 24px; font-size: 13px; color: #b91c1c; }
  .rpt-foot { margin-top: auto; display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; font-size: 11px; color: #475569; }
  .rpt-legend { display: flex; flex-wrap: wrap; gap: 6px 16px; margin-top: 10px; font-size: 11px; color: #475569; }
  .rpt-legend span, .rpt-code { display: inline-flex; align-items: center; gap: 6px; font-variant-numeric: tabular-nums; }
  .rpt-dot { display: inline-block; flex: none; width: 10px; height: 10px; border-radius: 2px; }
  .rpt-printed { text-align: right; white-space: nowrap; }
  .rpt-note { margin: 12px 0 0; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; }
  .rpt-label { font-size: 11px; font-weight: 700; color: #0b4d8b; }
  .rpt-note p { margin: 4px 0 0; font-size: 12.5px; white-space: pre-wrap; overflow-wrap: anywhere; }
  .rpt-by { margin-top: 4px; font-size: 10.5px; color: #64748b; font-variant-numeric: tabular-nums; }
  .rpt-table { width: 100%; margin-top: 12px; border-collapse: collapse; font-size: 11.5px; }
  .rpt-table th, .rpt-table td { padding: 5px 6px; border-bottom: 1px solid #e2e8f0; text-align: left; vertical-align: top; overflow-wrap: anywhere; }
  .rpt-table thead th { background: #eef3f9; color: #0b4d8b; font-weight: 700; border-bottom: 1px solid #94a3b8; }
  .rpt-table thead { display: table-header-group; }
  .rpt-table tr { break-inside: avoid; }
  .rpt-table .num { text-align: right; font-variant-numeric: tabular-nums; }
  .rpt-pre { white-space: pre-wrap; }
  .rpt-sub { margin-top: 2px; font-size: 10.5px; color: #64748b; }
  .rpt-empty { margin: 24px 0 0; font-size: 13px; color: #64748b; }
  @media print {
    .rpt-noprint { display: none !important; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .rpt { padding: 0; overflow: visible; background: #fff; }
    .rpt-sheet { width: 277mm; margin: 0; padding: 0; break-after: page; }
    .rpt-sheet:last-child { break-after: auto; }
    .rpt-map-sheet { min-height: 190mm; }
  }
`;

// Printable EPS day report. Sheet 1: the drawing with every job on it; sheet 2: the day note and the job list.
// Pure view: the page owns loading, the map snapshot and the print dialog.
export function CoordinationReportDocument({ report, snapshot, onSnapshot }: { report: CoordinationReport; snapshot: string | null; onSnapshot: (dataUrl: string) => void }) {
  const companies = useMemo(() => new Map(report.contractors.map((c) => [c.id, c])), [report.contractors]);
  const jobCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of report.items) counts.set(item.contractorId, (counts.get(item.contractorId) ?? 0) + 1);
    return counts;
  }, [report.items]);
  const rows = useMemo(
    () => [...report.items].sort((a, b) => (companies.get(a.contractorId)?.code ?? "").localeCompare(companies.get(b.contractorId)?.code ?? "")),
    [report.items, companies],
  );
  const withJobs = report.contractors.filter((c) => jobCounts.has(c.id));
  const day = formatThaiDate(report.date);

  const map = snapshot === null ? (
    <CoordinationCanvas map={report.map} contractors={report.contractors} items={report.items}
      selectedId={null} draft={null} tool="move"
      readOnly fixedHeight={MAP_HEIGHT} onSelect={noop} onChange={noop} onFinish={noop} onDeselect={noop} textEditing={false} onEditText={noop}
      onReady={(stage) => onSnapshot(stage ? stage.toDataURL({ pixelRatio: SNAPSHOT_RATIO, mimeType: "image/png" }) : "")} />
  ) : snapshot ? (
    <img src={snapshot} alt="แผนผังงานรายวัน" />
  ) : (
    <p className="rpt-error">โหลดภาพผังไม่สำเร็จ — รายการงานด้านหลังยังพิมพ์ได้</p>
  );

  return (
    <div className="rpt">
      <section className="rpt-sheet rpt-map-sheet">
        <header className="rpt-head">
          <div>
            <h1>แผนผังงานรายวัน</h1>
            <p className="rpt-meta">{report.projectName} · วันที่ {day}</p>
          </div>
        </header>
        <div className="rpt-frame">{map}</div>
        <footer className="rpt-foot">
          <div>{report.items.length} งาน · ผู้รับเหมา {withJobs.length} ราย</div>
          <div className="rpt-printed">พิมพ์โดย {report.generatedByName ?? "—"}<br />{stampOf(report.generatedAt)}</div>
        </footer>
      </section>

      <section className="rpt-sheet">
        <header className="rpt-head">
          <div>
            <h2>รายการงาน</h2>
            <p className="rpt-meta">{report.projectName} · วันที่ {day} · {report.items.length} รายการ</p>
          </div>
        </header>
        {withJobs.length > 0 && (
          <div className="rpt-legend">
            {withJobs.map((c) => <span key={c.id}><i className="rpt-dot" style={{ background: c.color }} />{c.code} · {jobCounts.get(c.id)}</span>)}
          </div>
        )}
        {report.dayNote && (
          <div className="rpt-note">
            <div className="rpt-label">หมายเหตุประจำวัน</div>
            <p>{report.dayNote.note}</p>
            <div className="rpt-by">โดย {report.dayNote.updatedByName ?? "EPS"} · {stampOf(report.dayNote.updatedAt)}</div>
          </div>
        )}
        {rows.length ? (
          <table className="rpt-table">
            <colgroup>
              <col style={{ width: "4%" }} /><col style={{ width: "20%" }} /><col style={{ width: "26%" }} />
              <col style={{ width: "12%" }} /><col style={{ width: "38%" }} />
            </colgroup>
            <thead>
              <tr><th className="num">#</th><th>ผู้รับเหมา</th><th>ชื่องาน</th><th>ประเภท</th><th>หมายเหตุ</th></tr>
            </thead>
            <tbody>
              {rows.map((item, index) => {
                const company = companies.get(item.contractorId);
                return (
                  <tr key={item.id}>
                    <td className="num">{index + 1}</td>
                    <td>
                      <span className="rpt-code"><i className="rpt-dot" style={{ background: company?.color }} /><strong>{company?.code ?? "—"}</strong></span>
                      <div className="rpt-sub">{company?.name}</div>
                    </td>
                    <td><strong>{item.title}</strong></td>
                    <td>{ICON_LABELS[item.icon]}</td>
                    <td className="rpt-pre">{item.note || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : <p className="rpt-empty">ไม่มีรายการงานในวันนี้</p>}
      </section>
    </div>
  );
}

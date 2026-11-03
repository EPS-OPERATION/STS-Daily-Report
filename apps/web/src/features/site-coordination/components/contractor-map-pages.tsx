import type { CoordinationData, CoordinationMap, CoordinationSectionWork } from "@sts/shared";
import type Konva from "konva";
import { useEffect, useMemo, useState } from "react";
import { useCoordination, useSectionWork } from "../hooks/use-coordination.js";
import { CoordinationCanvas } from "./coordination-canvas.js";

// Printed widths of the A4 report sheet at 96 dpi (the map snapshot keeps this size on paper).
const SHEET_PX = 718; // portrait: 190 mm content width
const SHEET_LANDSCAPE_PX = 1060; // landscape: 281 mm content width (8 mm page margins)
// The drawing uses the full sheet width (the biggest it can be on paper). Labels are hidden by the canvas when the
// drawing is narrower than 700 px on screen, so a short, wide-enough map keeps them; only a very tall map is capped.
const MAX_MAP_PX = 1000;
// Landscape map pages leave room above for the heading (~18 mm); the drawing fills the rest of the sheet height.
const MAX_MAP_LANDSCAPE_PX = 650;
const noop = () => undefined;

type Outcome = { shown: boolean };

/** How a map is captured for print. One report: PNG at 3× (sharpest). Many reports in one print: JPEG at 2× keeps
 *  memory low (a 3× PNG of an aerial photo is several MB) while still sharp on A4. */
export type MapSnapshot = { ratio: number; mimeType: "image/png" | "image/jpeg"; quality?: number };
const SINGLE_REPORT: MapSnapshot = { ratio: 3, mimeType: "image/png" };

// JPEG has no transparency: the empty margin around the drawing would turn black, so it is laid on white first.
function pictureOf(stage: Konva.Stage, capture: MapSnapshot): string {
  if (capture.mimeType === "image/png") return stage.toDataURL({ pixelRatio: capture.ratio, mimeType: "image/png" });
  const drawn = stage.toCanvas({ pixelRatio: capture.ratio });
  const out = document.createElement("canvas");
  out.width = drawn.width;
  out.height = drawn.height;
  const ctx = out.getContext("2d")!;
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.drawImage(drawn, 0, 0);
  return out.toDataURL(capture.mimeType, capture.quality);
}

// One working-area map, cut down to one contractor: their jobs drawn that day and the route sections they reported
// on (with the people card). A map where the contractor has nothing is left out.
function ContractorMap({ data, map, contractorId, projectId, date, onDone, active, capture, sheetWidth, maxHeight }: {
  data: CoordinationData; map: CoordinationMap; contractorId: string | null; projectId: string; date: string; onDone: (mapId: string, o: Outcome) => void;
  /** Draw the canvas now (a combined print draws one report's maps at a time). */
  active: boolean;
  capture: MapSnapshot;
  /** Printable size of the map page; the drawing is scaled to fit it, keeping the map's real aspect ratio. */
  sheetWidth: number; maxHeight: number;
}) {
  const sections = useMemo(() => data.sections.filter((s) => s.mapId === map.id), [data.sections, map.id]);
  // No contractor (site report): every job and every section's work; otherwise only that contractor's.
  const items = useMemo(() => data.items.filter((i) => i.mapId === map.id && (!contractorId || i.contractorId === contractorId)), [data.items, map.id, contractorId]);
  const work = useSectionWork(projectId, date, map.id, sections.length > 0);
  const mine: CoordinationSectionWork | undefined = useMemo(() => work.data && (contractorId ? {
    ...work.data,
    activities: work.data.activities.filter((a) => a.contractorId === contractorId),
    planned: work.data.planned.filter((p) => p.contractorId === contractorId),
  } : work.data), [work.data, contractorId]);
  const settled = sections.length === 0 || work.isSuccess || work.isError;
  const shown = items.length > 0 || Boolean(mine && (mine.activities.length || mine.planned.length));
  const [snapshot, setSnapshot] = useState<string | null>(null);

  useEffect(() => { if (settled && !shown) onDone(map.id, { shown: false }); }, [settled, shown]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (snapshot !== null) onDone(map.id, { shown: true }); }, [snapshot]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!settled || !shown) return null;
  if (!active && snapshot === null) return null;

  // Fit the drawing inside the printable map page without distorting it: the width is the sheet width
  // unless that would make the map taller than the page, then the height is the limit.
  let width = sheetWidth;
  let height = Math.round((sheetWidth * map.height) / map.width);
  if (height > maxHeight) {
    height = maxHeight;
    width = Math.round((maxHeight * map.width) / map.height);
  }
  const used = new Set(mine?.activities.map((a) => a.sectionId) ?? []);
  const codes = sections.filter((s) => used.has(s.id)).map((s) => s.code);
  // Many jobs on one drawing: number them and print the names in a table below; long titles would pile up.
  const numbered = items.length > 8;
  return (
    <>
      <div className="cmap">
        <div className="cmap-title">{map.nameTh || map.name}{codes.length ? ` · ช่วง ${codes.join(", ")}` : ""}{items.length ? ` · ${items.length} งานบนผัง` : ""}</div>
        <div className="cmap-frame" style={{ width, height }}>
          {snapshot === null ? (
            <CoordinationCanvas map={map} contractors={data.contractors} items={items} itemTypes={data.itemTypes ?? []} sections={sections} sectionWork={mine}
              selectedId={null} draft={null} tool="move" readOnly reportFocus="items" numberLabels={numbered} fixedHeight={height} onSelect={noop} onChange={noop} onFinish={noop} onDeselect={noop}
              textEditing={false} onEditText={noop}
              onReady={(stage) => {
                // A storage picture served without CORS cannot be exported: say so instead of a blank frame.
                try { setSnapshot(stage ? pictureOf(stage, capture) : ""); } catch { setSnapshot(""); }
              }} />
          ) : snapshot ? <img src={snapshot} alt={map.nameTh || map.name} /> : <p className="cmap-note">โหลดภาพผังไม่สำเร็จ</p>}
        </div>
      </div>
      {numbered ? (
        <table className="cmap-legend">
          <thead>
            <tr><th colSpan={3} className="cmap-legend-title">{map.nameTh || map.name} · รายการงานบนแผนผัง</th></tr>
            <tr><th className="c" style={{ width: 34 }}>#</th><th style={{ width: 90 }}>ผู้รับเหมา</th><th>งาน</th></tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={item.id}>
                <td className="c">{i + 1}</td>
                <td>{data.contractors.find((c) => c.id === item.contractorId)?.code ?? "-"}</td>
                <td>{item.title}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </>
  );
}

/** The contractor's own part of the Map for a day (every working area), for the printed daily report.
 *  `onReady` fires once every map is drawn (or left out), so the page can open the print dialog. */
export function ContractorMapPages({ projectId, contractorId = null, date, onReady, active = true, capture = SINGLE_REPORT, compactEmpty = false, landscape = false, subtitle = "เฉพาะงานของผู้รับเหมารายนี้" }: {
  projectId: string;
  /** null/omitted = every contractor's jobs (the Site Daily Report); otherwise only this contractor. */
  contractorId?: string | null;
  date: string; onReady: () => void;
  /** false = load the data but wait before drawing (a combined print draws one report's maps at a time). */
  active?: boolean;
  capture?: MapSnapshot;
  /** No map usage: a one-line note under the report instead of a page of its own (combined print). */
  compactEmpty?: boolean;
  /** Print the map pages on their own A4 landscape sheets, so the drawing is bigger and its labels readable. */
  landscape?: boolean;
  /** Line shown next to the "Site Utilization Map" heading. */
  subtitle?: string;
}) {
  const query = useCoordination(projectId, date);
  const data = query.data?.data;
  const [done, setDone] = useState<Record<string, Outcome>>({});
  const maps = data?.maps ?? [];
  const finished = query.isError || (Boolean(data) && maps.every((m) => done[m.id]));
  const anyShown = Object.values(done).some((o) => o.shown);
  const sheetWidth = landscape ? SHEET_LANDSCAPE_PX : SHEET_PX;
  const maxHeight = landscape ? MAX_MAP_LANDSCAPE_PX : MAX_MAP_PX;

  useEffect(() => { if (finished) onReady(); }, [finished]); // eslint-disable-line react-hooks/exhaustive-deps

  if (compactEmpty && finished && !anyShown && !query.isError) {
    return <p className="cmap-none" style={{ fontSize: 12, margin: "4px 0 0", color: "#555" }}>แผนผังพื้นที่ใช้งาน: ไม่มีพื้นที่ใช้งานบนแผนผังในวันนี้</p>;
  }

  return (
    <section className="cmap-sheet">
      <style>{`
        ${landscape ? "@page cmap { size: A4 landscape; margin: 8mm; } .cmap-sheet { page: cmap; }" : ""}
        .cmap-sheet { break-before: page; break-after: auto; font-size: 12px; padding-top: 3mm; }
        ${landscape ? "@media screen { .cmap-sheet { width: 1123px; max-width: 100%; margin: 24px auto; padding: 24px; background: #fff; box-shadow: 0 2px 16px rgba(0,0,0,.18); box-sizing: border-box; } .cmap-frame { width: 100% !important; height: auto !important; } .cmap-frame img { width: 100% !important; height: auto !important; } }" : ""}
        .cmap-head { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1.5px solid #0B4D8B; color: #0B4D8B; margin-bottom: 8px; }
        .cmap-head h2 { font-size: 15px; margin: 0; }
        .cmap { break-inside: avoid; margin-bottom: 10px; }
        .cmap:last-child { margin-bottom: 0; }
        .cmap-title { font-weight: 700; margin-bottom: 4px; }
        .cmap-frame { max-width: 100%; margin: 0 auto; overflow: hidden; }
        .cmap-frame img { width: 100%; height: 100%; object-fit: contain; display: block; }
        .cmap-legend { width: 100%; border-collapse: collapse; font-size: 10px; margin: 2px 0 16px; }
        .cmap-legend th, .cmap-legend td { border: 1px solid #888; padding: 2px 4px; text-align: left; vertical-align: top; overflow-wrap: anywhere; }
        .cmap-legend thead { display: table-header-group; }
        .cmap-legend .c { text-align: center; }
        .cmap-legend-title { background: #0B4D8B; color: #fff; text-align: center !important; }
        .cmap-note { color: #555; margin: 8px; }
      `}</style>
      <div className="cmap-head">
        <h2>แผนผังพื้นที่ใช้งาน (Site Utilization Map)</h2>
        <span>{subtitle}</span>
      </div>
      {query.isError ? <p className="cmap-note">โหลดแผนผังไม่สำเร็จ</p> : null}
      {data ? maps.map((map) => (
        <ContractorMap key={map.id} data={data} map={map} contractorId={contractorId} projectId={projectId} date={date} active={active} capture={capture}
          sheetWidth={sheetWidth} maxHeight={maxHeight}
          onDone={(id, o) => setDone((prev) => (prev[id] ? prev : { ...prev, [id]: o }))} />
      )) : null}
      {finished && !anyShown && !query.isError ? <p className="cmap-note">ไม่มีพื้นที่ใช้งานบนแผนผังในวันนี้</p> : null}
    </section>
  );
}

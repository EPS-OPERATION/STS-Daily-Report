import type { CoordinationData, CoordinationMap, CoordinationSectionWork } from "@sts/shared";
import type Konva from "konva";
import { useEffect, useMemo, useState } from "react";
import { useCoordination, useSectionWork } from "../hooks/use-coordination.js";
import { CoordinationCanvas } from "./coordination-canvas.js";

// Printed width of the A4 portrait report sheet (190 mm at 96 dpi): the map snapshot keeps this size on paper.
const SHEET_PX = 718;
// Two maps fit one page: each drawing is at most ~120 mm tall.
const MAX_MAP_PX = 450;
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
function ContractorMap({ data, map, contractorId, projectId, date, onDone, active, capture }: {
  data: CoordinationData; map: CoordinationMap; contractorId: string; projectId: string; date: string; onDone: (mapId: string, o: Outcome) => void;
  /** Draw the canvas now (a combined print draws one report's maps at a time). */
  active: boolean;
  capture: MapSnapshot;
}) {
  const sections = useMemo(() => data.sections.filter((s) => s.mapId === map.id), [data.sections, map.id]);
  const items = useMemo(() => data.items.filter((i) => i.mapId === map.id && i.contractorId === contractorId), [data.items, map.id, contractorId]);
  const work = useSectionWork(projectId, date, map.id, sections.length > 0);
  const mine: CoordinationSectionWork | undefined = useMemo(() => work.data && {
    ...work.data,
    activities: work.data.activities.filter((a) => a.contractorId === contractorId),
    planned: work.data.planned.filter((p) => p.contractorId === contractorId),
  }, [work.data, contractorId]);
  const settled = sections.length === 0 || work.isSuccess || work.isError;
  const shown = items.length > 0 || Boolean(mine && (mine.activities.length || mine.planned.length));
  const [snapshot, setSnapshot] = useState<string | null>(null);

  useEffect(() => { if (settled && !shown) onDone(map.id, { shown: false }); }, [settled, shown]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (snapshot !== null) onDone(map.id, { shown: true }); }, [snapshot]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!settled || !shown) return null;
  if (!active && snapshot === null) return null;

  const height = Math.min(MAX_MAP_PX, Math.round((SHEET_PX * map.height) / map.width));
  const used = new Set(mine?.activities.map((a) => a.sectionId) ?? []);
  const codes = sections.filter((s) => used.has(s.id)).map((s) => s.code);
  return (
    <div className="cmap">
      <div className="cmap-title">{map.nameTh || map.name}{codes.length ? ` · ช่วง ${codes.join(", ")}` : ""}{items.length ? ` · ${items.length} งานบนผัง` : ""}</div>
      <div className="cmap-frame" style={{ height }}>
        {snapshot === null ? (
          <CoordinationCanvas map={map} contractors={data.contractors} items={items} itemTypes={data.itemTypes ?? []} sections={sections} sectionWork={mine}
            selectedId={null} draft={null} tool="move" readOnly fixedHeight={height} onSelect={noop} onChange={noop} onFinish={noop} onDeselect={noop}
            textEditing={false} onEditText={noop}
            onReady={(stage) => {
              // A storage picture served without CORS cannot be exported: say so instead of a blank frame.
              try { setSnapshot(stage ? pictureOf(stage, capture) : ""); } catch { setSnapshot(""); }
            }} />
        ) : snapshot ? <img src={snapshot} alt={map.nameTh || map.name} /> : <p className="cmap-note">โหลดภาพผังไม่สำเร็จ</p>}
      </div>
    </div>
  );
}

/** The contractor's own part of the Map for a day (every working area), for the printed daily report.
 *  `onReady` fires once every map is drawn (or left out), so the page can open the print dialog. */
export function ContractorMapPages({ projectId, contractorId, date, onReady, active = true, capture = SINGLE_REPORT, compactEmpty = false }: {
  projectId: string; contractorId: string; date: string; onReady: () => void;
  /** false = load the data but wait before drawing (a combined print draws one report's maps at a time). */
  active?: boolean;
  capture?: MapSnapshot;
  /** No map usage: a one-line note under the report instead of a page of its own (combined print). */
  compactEmpty?: boolean;
}) {
  const query = useCoordination(projectId, date);
  const data = query.data?.data;
  const [done, setDone] = useState<Record<string, Outcome>>({});
  const maps = data?.maps ?? [];
  const finished = query.isError || (Boolean(data) && maps.every((m) => done[m.id]));
  const anyShown = Object.values(done).some((o) => o.shown);

  useEffect(() => { if (finished) onReady(); }, [finished]); // eslint-disable-line react-hooks/exhaustive-deps

  if (compactEmpty && finished && !anyShown && !query.isError) {
    return <p className="cmap-none" style={{ fontSize: 12, margin: "4px 0 0", color: "#555" }}>แผนผังพื้นที่ใช้งาน: ไม่มีพื้นที่ใช้งานบนแผนผังในวันนี้</p>;
  }

  return (
    <section className="cmap-sheet">
      <style>{`
        .cmap-sheet { break-before: page; font-size: 12px; padding-top: 3mm; }
        .cmap-head { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1.5px solid #0B4D8B; color: #0B4D8B; margin-bottom: 8px; }
        .cmap-head h2 { font-size: 15px; margin: 0; }
        .cmap { break-inside: avoid; margin-bottom: 10px; }
        .cmap-title { font-weight: 700; margin-bottom: 4px; }
        .cmap-frame { width: ${SHEET_PX}px; max-width: 100%; overflow: hidden; }
        .cmap-frame img { width: 100%; height: 100%; object-fit: contain; display: block; }
        .cmap-note { color: #555; margin: 8px; }
      `}</style>
      <div className="cmap-head">
        <h2>แผนผังพื้นที่ใช้งาน (Site Utilization Map)</h2>
        <span>เฉพาะงานของผู้รับเหมารายนี้</span>
      </div>
      {query.isError ? <p className="cmap-note">โหลดแผนผังไม่สำเร็จ</p> : null}
      {data ? maps.map((map) => (
        <ContractorMap key={map.id} data={data} map={map} contractorId={contractorId} projectId={projectId} date={date} active={active} capture={capture}
          onDone={(id, o) => setDone((prev) => (prev[id] ? prev : { ...prev, [id]: o }))} />
      )) : null}
      {finished && !anyShown && !query.isError ? <p className="cmap-note">ไม่มีพื้นที่ใช้งานบนแผนผังในวันนี้</p> : null}
    </section>
  );
}

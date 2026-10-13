import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import CropSquareOutlinedIcon from "@mui/icons-material/CropSquareOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import PentagonOutlinedIcon from "@mui/icons-material/PentagonOutlined";
import RemoveIcon from "@mui/icons-material/Remove";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ButtonGroup from "@mui/material/ButtonGroup";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import dayjs from "dayjs";
import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import {
  FALLBACK_MAP_COLOR,
  MAP_TITLE_MAX,
  SITE_ICONS,
  mapContractorColors,
  type MapContractor,
  type MapPoint,
  type MapRect,
  type SiteCalloutMarker,
  type SiteIconType,
} from "../types/coordination.types.js";

const ZOOMS = [1, 1.25, 1.5, 2];
const MIN_AREA = 0.015; // smallest drawn rectangle side (fraction of the drawing)
const round4 = (n: number) => Math.round(n * 10000) / 10000;
const clampPin = (n: number) => Math.min(0.97, Math.max(0.03, round4(n)));
const clamp01 = (n: number) => Math.min(1, Math.max(0, round4(n)));

const DEFAULT_TEXT: Record<SiteIconType, string> = {
  crane: "จุดจอดเครน",
  machinery: "เครื่องจักรทำงาน",
  truck: "จุดจอดรถ",
  pipe: "งานติดตั้งท่อ",
  weld: "งานตัดเชื่อม",
  box: "จุดประกอบ / วางของ",
  pin: "พื้นที่ทำงาน",
};

type Drag =
  | { kind: "target" | "box"; id: string; startX: number; startY: number; moved: boolean }
  | { kind: "area-move"; id: string; startX: number; startY: number; moved: boolean; px: number; py: number; orig: SiteCalloutMarker }
  | { kind: "area-resize"; id: string; startX: number; startY: number; moved: boolean; area: MapRect }
  | { kind: "poly-move"; id: string; startX: number; startY: number; moved: boolean; px: number; py: number; orig: SiteCalloutMarker }
  | { kind: "vertex"; id: string; startX: number; startY: number; moved: boolean; index: number; points: MapPoint[] }
  | { kind: "draw"; startX: number; startY: number; x0: number; y0: number };

type Shape = "rect" | "poly";
const CLOSE_PX = 14; // click this close to the first corner to close the shape

interface Editing {
  id: string;
  text: string;
  comment: string;
  icon: SiteIconType;
  contractorCode: string;
  /** Just placed: close its popup after the dialog so the map stays free for the next job. */
  isNew?: boolean;
}

interface CoordinationMapBoardProps {
  date: string;
  markers: SiteCalloutMarker[];
  /** contractor code → colour for the day (from useCoordinationState). */
  colors: Map<string, string>;
  activeMarkerId: string | null;
  onSelectMarker: (id: string | null) => void;
  onUpdateTarget?: (id: string, targetX: number, targetY: number) => void;
  onUpdateBox?: (id: string, boxX: number, boxY: number) => void;
  onUpdateCallout?: (id: string, updates: Partial<SiteCalloutMarker>) => void;
  onDeleteCallout?: (id: string) => void;
  onAddCallout?: (item: Omit<SiteCalloutMarker, "id" | "createdAt" | "date">) => string;
  mapView: "plan" | "topview";
  onChangeMapView: (view: "plan" | "topview") => void;
  /** Contractors that can be placed (EPS: every project contractor; contractor: own companies). */
  contractors?: MapContractor[];
  userContractorCode?: string;
  readOnly?: boolean;
}

// Daily site map. Each job = a big contractor-coloured icon + the area it occupies (rectangle in the
// same colour) + a short title; the longer comment opens on click, one job at a time ("show all
// text" opens every comment for meetings). One colour per contractor for the day, with a legend.
export function CoordinationMapBoard({
  date,
  markers,
  colors,
  activeMarkerId,
  onSelectMarker,
  onUpdateTarget,
  onUpdateBox,
  onUpdateCallout,
  onDeleteCallout,
  onAddCallout,
  mapView,
  onChangeMapView,
  contractors = [],
  userContractorCode,
  readOnly = false,
}: CoordinationMapBoardProps) {
  const [zoomIdx, setZoomIdx] = useState<number>(0);
  const zoom = ZOOMS[zoomIdx]!;
  const surfaceRef = useRef<HTMLDivElement>(null);
  const suppressClick = useRef(false);
  const dragRef = useRef<Drag | null>(null);

  const [selectedIcon, setSelectedIcon] = useState<SiteIconType>("crane");
  const [activeCode, setActiveCode] = useState<string>(userContractorCode ?? "");
  const [draft, setDraft] = useState<MapRect | null>(null);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SiteCalloutMarker | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [shape, setShape] = useState<Shape>("rect");
  const [poly, setPoly] = useState<MapPoint[]>([]); // corners clicked so far (free shape)
  const [hover, setHover] = useState<MapPoint | null>(null);
  const canEdit = !readOnly;

  // Everyone that can be chosen: the given list plus anyone already on the map today.
  const contractorOptions = useMemo(() => {
    const byCode = new Map<string, string>();
    for (const c of contractors) byCode.set(c.code, c.name);
    for (const m of markers) if (!byCode.has(m.contractorCode)) byCode.set(m.contractorCode, m.contractorName);
    return [...byCode].map(([code, name]) => ({ code, name })).sort((a, b) => a.code.localeCompare(b.code));
  }, [contractors, markers]);

  useEffect(() => {
    if (!activeCode && contractorOptions[0]) setActiveCode(userContractorCode ?? contractorOptions[0].code);
  }, [activeCode, contractorOptions, userContractorCode]);

  // Colour a contractor has today, or the one it will get when first placed.
  const colorOf = (code: string) => colors.get(code) ?? mapContractorColors([...colors.keys(), code]).get(code) ?? FALLBACK_MAP_COLOR;
  const nameOf = (code: string) => contractorOptions.find((c) => c.code === code)?.name ?? code;
  const emojiOf = (icon: SiteIconType) => SITE_ICONS.find((i) => i.type === icon)?.emoji ?? "📍";

  const legend = [...colors].map(([code, color]) => ({ code, color, name: nameOf(code) }));
  const active = markers.find((m) => m.id === activeMarkerId) ?? null;
  const mapSrc = mapView === "plan" ? "/site-plan/site-plan-drawing.png" : "/site-plan/site-model-topdown.png";

  const pointFrom = (clientX: number, clientY: number) => {
    const rect = surfaceRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return { x: (clientX - rect.left) / rect.width, y: (clientY - rect.top) / rect.height };
  };

  // Delete / Backspace on the selected job asks to delete it.
  useEffect(() => {
    if (!canEdit) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.key !== "Delete" && e.key !== "Backspace") || !active || editing) return;
      const t = e.target as HTMLElement | null;
      if (t && ["INPUT", "TEXTAREA"].includes(t.tagName)) return;
      setDeleteTarget(active);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canEdit, active, editing]);

  const openEdit = (m: SiteCalloutMarker) =>
    setEditing({ id: m.id, text: m.text, comment: m.comment ?? "", icon: m.icon, contractorCode: m.contractorCode });

  const startDrag = (drag: Drag) => (e: ReactPointerEvent<Element>) => {
    if (!canEdit || e.button !== 0) return;
    const t = e.target as HTMLElement | null;
    if (t && t.closest("button")) return;
    e.stopPropagation();
    dragRef.current = { ...drag, startX: e.clientX, startY: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  // Drag on empty drawing = draw the area of a new job.
  const handleSurfacePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!canEdit || !onAddCallout || e.button !== 0 || shape === "poly") return;
    const pt = pointFrom(e.clientX, e.clientY);
    if (!pt) return;
    dragRef.current = { kind: "draw", startX: e.clientX, startY: e.clientY, x0: clamp01(pt.x), y0: clamp01(pt.y) };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!canEdit) return;
    const pt = pointFrom(e.clientX, e.clientY);
    if (!pt) return;
    if (!d) {
      if (poly.length > 0) setHover({ x: clamp01(pt.x), y: clamp01(pt.y) });
      return;
    }
    if (d.kind === "draw") {
      const x1 = clamp01(pt.x);
      const y1 = clamp01(pt.y);
      setDraft({ x: Math.min(d.x0, x1), y: Math.min(d.y0, y1), w: Math.abs(x1 - d.x0), h: Math.abs(y1 - d.y0) });
      return;
    }
    if (!d.moved && Math.hypot(e.clientX - d.startX, e.clientY - d.startY) < 4) return;
    d.moved = true;
    if (d.kind === "target") onUpdateTarget?.(d.id, clampPin(pt.x), clampPin(pt.y));
    else if (d.kind === "box") onUpdateBox?.(d.id, clampPin(pt.x), clampPin(pt.y));
    else if (d.kind === "area-move" && d.orig.area) {
      // The job moves as one: area, icon and title shift together.
      const a = d.orig.area;
      const dx = Math.min(1 - a.x - a.w, Math.max(-a.x, pt.x - d.px));
      const dy = Math.min(1 - a.y - a.h, Math.max(-a.y, pt.y - d.py));
      onUpdateCallout?.(d.id, {
        area: { ...a, x: round4(a.x + dx), y: round4(a.y + dy) },
        targetX: clampPin(d.orig.targetX + dx),
        targetY: clampPin(d.orig.targetY + dy),
        boxX: clampPin(d.orig.boxX + dx),
        boxY: clampPin(d.orig.boxY + dy),
      });
    } else if (d.kind === "poly-move" && d.orig.polygon) {
      const pts = d.orig.polygon;
      const minX = Math.min(...pts.map((q) => q.x));
      const maxX = Math.max(...pts.map((q) => q.x));
      const minY = Math.min(...pts.map((q) => q.y));
      const maxY = Math.max(...pts.map((q) => q.y));
      const dx = Math.min(1 - maxX, Math.max(-minX, pt.x - d.px));
      const dy = Math.min(1 - maxY, Math.max(-minY, pt.y - d.py));
      onUpdateCallout?.(d.id, {
        polygon: pts.map((q) => ({ x: round4(q.x + dx), y: round4(q.y + dy) })),
        targetX: clampPin(d.orig.targetX + dx),
        targetY: clampPin(d.orig.targetY + dy),
        boxX: clampPin(d.orig.boxX + dx),
        boxY: clampPin(d.orig.boxY + dy),
      });
    } else if (d.kind === "vertex") {
      onUpdateCallout?.(d.id, { polygon: d.points.map((q, i) => (i === d.index ? { x: clamp01(pt.x), y: clamp01(pt.y) } : q)) });
    } else if (d.kind === "area-resize") {
      onUpdateCallout?.(d.id, {
        area: { ...d.area, w: clamp01(Math.max(MIN_AREA, Math.min(1 - d.area.x, pt.x - d.area.x))), h: clamp01(Math.max(MIN_AREA, Math.min(1 - d.area.y, pt.y - d.area.y))) },
      });
    }
  };

  const handlePointerUp = () => {
    const d = dragRef.current;
    dragRef.current = null;
    if (d && d.kind !== "draw" && d.moved) suppressClick.current = true;
    if (d?.kind !== "draw") return;
    const box = draft;
    setDraft(null);
    if (!box || box.w < MIN_AREA || box.h < MIN_AREA || !onAddCallout || !activeCode) return;
    suppressClick.current = true;
    createJobWithArea({ area: box }, box, { x: box.x + box.w / 2, y: box.y + box.h / 2 });
  };

  // New job that owns an area: icon at the area's centre, title just right of it.
  const createJobWithArea = (shapeFields: Pick<SiteCalloutMarker, "area" | "polygon">, bbox: MapRect, centre: MapPoint) => {
    if (!onAddCallout || !activeCode) return;
    const id = onAddCallout({
      contractorCode: activeCode,
      contractorName: nameOf(activeCode),
      icon: selectedIcon,
      text: DEFAULT_TEXT[selectedIcon],
      ...shapeFields,
      targetX: clampPin(centre.x),
      targetY: clampPin(centre.y),
      boxX: clampPin(bbox.x + bbox.w + 0.07),
      boxY: clampPin(centre.y),
    });
    setEditing({ id, text: DEFAULT_TEXT[selectedIcon], comment: "", icon: selectedIcon, contractorCode: activeCode, isNew: true });
  };

  const cancelPoly = () => {
    setPoly([]);
    setHover(null);
  };

  const finishPoly = (points: MapPoint[] = poly) => {
    cancelPoly();
    if (points.length < 3) return;
    const xs = points.map((q) => q.x);
    const ys = points.map((q) => q.y);
    const bbox = { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
    if (bbox.w < MIN_AREA && bbox.h < MIN_AREA) return;
    const centre = { x: xs.reduce((a, b) => a + b, 0) / xs.length, y: ys.reduce((a, b) => a + b, 0) / ys.length };
    createJobWithArea({ polygon: points }, bbox, centre);
  };

  // Enter = close the shape, Esc = cancel it.
  useEffect(() => {
    if (poly.length === 0) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") finishPoly();
      else if (e.key === "Escape") cancelPoly();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }); // re-bound each render: reads the current corners

  // Click on empty drawing: edit mode = new job without an area; view mode = close the popup.
  const handleSurfaceClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    if (!canEdit || !onAddCallout || !activeCode) return onSelectMarker(null);
    if (active && poly.length === 0) return onSelectMarker(null); // first click just closes the open popup
    const pt = pointFrom(e.clientX, e.clientY);
    if (!pt) return;
    if (shape === "poly") {
      const q = { x: clamp01(pt.x), y: clamp01(pt.y) };
      const first = poly[0];
      const rect = surfaceRef.current?.getBoundingClientRect();
      const nearFirst = Boolean(first && rect && Math.hypot((q.x - first.x) * rect.width, (q.y - first.y) * rect.height) < CLOSE_PX);
      if (nearFirst && poly.length >= 3) finishPoly();
      else if (e.detail >= 2) finishPoly(); // double-click closes (its 2nd click adds no corner)
      else setPoly([...poly, q]);
      return;
    }
    const x = clampPin(pt.x);
    const y = clampPin(pt.y);
    const id = onAddCallout({
      contractorCode: activeCode,
      contractorName: nameOf(activeCode),
      icon: selectedIcon,
      text: DEFAULT_TEXT[selectedIcon],
      targetX: x,
      targetY: y,
      boxX: clampPin(x + 0.08),
      boxY: clampPin(y + (y > 0.5 ? -0.07 : 0.07)),
    });
    setEditing({ id, text: DEFAULT_TEXT[selectedIcon], comment: "", icon: selectedIcon, contractorCode: activeCode, isNew: true });
  };

  const selectJob = (id: string) => (e: React.MouseEvent) => {
    e.stopPropagation();
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    onSelectMarker(activeMarkerId === id ? null : id);
  };

  const closeEdit = () => {
    if (editing?.isNew) onSelectMarker(null);
    setEditing(null);
  };

  const saveEdit = () => {
    if (!editing || !editing.text.trim()) return;
    onUpdateCallout?.(editing.id, {
      text: editing.text.trim().slice(0, MAP_TITLE_MAX),
      comment: editing.comment.trim() || undefined,
      icon: editing.icon,
      contractorCode: editing.contractorCode,
      contractorName: nameOf(editing.contractorCode),
    });
    closeEdit();
  };

  const addAreaTo = (m: SiteCalloutMarker) => {
    const w = 0.08;
    const h = 0.07;
    onUpdateCallout?.(m.id, { polygon: undefined, area: { x: clamp01(Math.min(1 - w, Math.max(0, m.targetX - w / 2))), y: clamp01(Math.min(1 - h, Math.max(0, m.targetY - h / 2))), w, h } });
  };

  const stopAll = {
    onPointerDown: (e: React.SyntheticEvent) => e.stopPropagation(),
    onClick: (e: React.SyntheticEvent) => e.stopPropagation(),
  };

  const contractorSelect = (value: string, onChange: (code: string) => void, id: string) => (
    <FormControl size="small" sx={{ minWidth: 220 }}>
      <InputLabel id={id}>ผู้รับเหมา</InputLabel>
      <Select labelId={id} label="ผู้รับเหมา" value={contractorOptions.some((c) => c.code === value) ? value : ""} onChange={(e) => onChange(e.target.value)}>
        {contractorOptions.map((c) => (
          <MenuItem key={c.code} value={c.code}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: colorOf(c.code), flexShrink: 0 }} />
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {c.code} · {c.name}
              </Typography>
            </Stack>
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );

  return (
    <Box>
      {/* Edit toolbar: contractor (its colour) + icon */}
      {canEdit && (
        <Paper variant="outlined" sx={{ p: 1.5, mb: 1.5, borderRadius: 2.5, borderColor: "primary.light" }}>
          <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
            {contractorSelect(activeCode, setActiveCode, "map-contractor-toolbar")}
            {activeCode ? (
              <Stack direction="row" spacing={0.75} alignItems="center">
                <Box sx={{ width: 18, height: 18, borderRadius: "50%", bgcolor: colorOf(activeCode), border: "2px solid #fff", boxShadow: 1 }} />
                <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary" }}>
                  สีของ {activeCode} วันนี้
                </Typography>
              </Stack>
            ) : null}
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mt: 1.5 }}>
            {SITE_ICONS.map((it) => {
              const on = selectedIcon === it.type;
              return (
                <Button
                  key={it.type}
                  variant={on ? "contained" : "outlined"}
                  onClick={() => setSelectedIcon(it.type)}
                  sx={{ minWidth: 0, px: 1.5, py: 0.75, fontWeight: on ? 800 : 600, textTransform: "none", gap: 0.75 }}
                >
                  <span style={{ fontSize: 24, lineHeight: 1 }}>{it.emoji}</span>
                  {it.label}
                </Button>
              );
            })}
          </Stack>
          <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mt: 1.5 }}>
            <Typography variant="caption" sx={{ fontWeight: 700 }}>
              รูปพื้นที่:
            </Typography>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={shape}
              onChange={(_, v: Shape | null) => {
                if (!v) return;
                cancelPoly();
                setShape(v);
              }}
            >
              <ToggleButton value="rect" sx={{ px: 1.5, fontWeight: 700, gap: 0.75 }}>
                <CropSquareOutlinedIcon fontSize="small" /> สี่เหลี่ยม (ลาก)
              </ToggleButton>
              <ToggleButton value="poly" sx={{ px: 1.5, fontWeight: 700, gap: 0.75 }}>
                <PentagonOutlinedIcon fontSize="small" /> รูปทรงอิสระ (คลิกทีละมุม)
              </ToggleButton>
            </ToggleButtonGroup>
            {poly.length > 0 ? (
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="caption" sx={{ fontWeight: 700, color: "primary.main" }}>
                  กำลังวาด {poly.length} มุม
                </Typography>
                <Button size="small" variant="contained" disabled={poly.length < 3} onClick={() => finishPoly()}>
                  ปิดรูป
                </Button>
                <Button size="small" color="inherit" onClick={cancelPoly}>
                  ยกเลิก
                </Button>
              </Stack>
            ) : null}
          </Stack>
          {shape === "poly" ? (
            <Typography variant="caption" sx={{ display: "block", mt: 1, color: "text.secondary" }}>
              <b>คลิกทีละมุม</b> ตามขอบพื้นที่ที่ใช้ แล้ว <b>คลิกมุมแรก / ดับเบิลคลิก / Enter</b> เพื่อปิดรูป (Esc = ยกเลิก) • คลิกไอคอนแล้วลากจุดมุมเพื่อแก้รูป
              หรือลากพื้นที่เพื่อย้าย
            </Typography>
          ) : null}
          <Typography variant="caption" sx={{ display: shape === "poly" ? "none" : "block", mt: 1, color: "text.secondary" }}>
            <b>ลากบนผัง</b> = วาดพื้นที่ที่งานนี้ใช้ แล้วไอคอนจะอยู่กลางพื้นที่ • <b>คลิก</b> = วางไอคอนอย่างเดียว • คลิกไอคอนเพื่อดู/แก้ไข หมายเหตุ ย้าย
            หรือปรับขนาดพื้นที่ (ลากมุมขวาล่าง)
          </Typography>
        </Paper>
      )}

      {/* Legend + show-all + view switch */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1} sx={{ px: 0.5, mb: 1 }}>
        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
          {legend.length === 0 ? (
            <Typography variant="caption" color="text.secondary">
              ยังไม่มีผู้รับเหมาบนผังวันนี้
            </Typography>
          ) : (
            legend.map((l) => (
              <Stack key={l.code} direction="row" spacing={0.6} alignItems="center">
                <Box sx={{ width: 14, height: 14, borderRadius: 0.75, bgcolor: alpha(l.color, 0.25), border: `2px solid ${l.color}` }} />
                <Typography variant="caption" sx={{ fontWeight: 700 }}>
                  {l.code}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {l.name}
                </Typography>
              </Stack>
            ))
          )}
        </Stack>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <FormControlLabel
            control={<Switch size="small" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />}
            label={<Typography variant="caption" sx={{ fontWeight: 700 }}>แสดงหมายเหตุทั้งหมด</Typography>}
            sx={{ mr: 0 }}
          />
          <ButtonGroup size="small">
            <Button variant={mapView === "plan" ? "contained" : "outlined"} onClick={() => onChangeMapView("plan")} sx={{ fontSize: 11, fontWeight: 700 }}>
              CAD แบบแปลน
            </Button>
            <Button variant={mapView === "topview" ? "contained" : "outlined"} onClick={() => onChangeMapView("topview")} sx={{ fontSize: 11, fontWeight: 700 }}>
              ภาพผังสี
            </Button>
          </ButtonGroup>
        </Stack>
      </Stack>

      <Box sx={{ position: "relative", border: 1, borderColor: "divider", borderRadius: 2, overflow: "hidden", bgcolor: "#F8FAFC" }}>
        {/* Day banner */}
        <Box sx={{ position: "absolute", top: 12, left: 12, zIndex: 50, px: 1.75, py: 0.75, bgcolor: "#FFFFFF", border: "2.5px solid #DC2626", borderRadius: 1, boxShadow: 2, pointerEvents: "none" }}>
          <Typography sx={{ fontWeight: 800, fontSize: { xs: 14, md: 17 }, lineHeight: 1.2 }}>
            แผนงานของวันที่ {dayjs(date).format("D/M/YYYY")}
            {markers.length === 0 ? " — ไม่มีกิจกรรม" : ""}
          </Typography>
        </Box>

        {/* Zoom */}
        <Stack spacing={0.5} sx={{ position: "absolute", bottom: 14, right: 14, zIndex: 50, bgcolor: "rgba(255,255,255,0.92)", p: 0.5, borderRadius: 2, border: "1px solid rgba(0,0,0,0.12)", boxShadow: 2 }}>
          <IconButton size="small" disabled={zoomIdx >= ZOOMS.length - 1} onClick={() => setZoomIdx((i) => Math.min(ZOOMS.length - 1, i + 1))}>
            <AddIcon fontSize="small" />
          </IconButton>
          <Typography variant="caption" sx={{ textAlign: "center", fontSize: 10, fontWeight: 700 }}>
            {zoom * 100}%
          </Typography>
          <IconButton size="small" disabled={zoomIdx <= 0} onClick={() => setZoomIdx((i) => Math.max(0, i - 1))}>
            <RemoveIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={() => setZoomIdx(0)}>
            <RestartAltIcon fontSize="small" />
          </IconButton>
        </Stack>

        <Box
          sx={{ overflow: "auto", width: "100%", height: { xs: 500, md: 680 }, cursor: canEdit ? "crosshair" : "default" }}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          <Box
            ref={surfaceRef}
            onPointerDown={handleSurfacePointerDown}
            onClick={handleSurfaceClick}
            sx={{ position: "relative", width: `${zoom * 100}%`, minWidth: `${zoom * 100}%`, userSelect: "none", display: "inline-block", touchAction: canEdit ? "none" : "auto" }}
          >
            <Box component="img" src={mapSrc} alt="Site Coordination Map" draggable={false} sx={{ width: "100%", display: "block" }} />

            {/* Areas the jobs occupy */}
            {markers.map((m) => {
              if (!m.area || m.polygon) return null;
              const a = m.area;
              const color = colors.get(m.contractorCode) ?? FALLBACK_MAP_COLOR;
              const selected = m.id === activeMarkerId;
              const dimmed = Boolean(active) && !selected;
              return (
                <Box
                  key={`area-${m.id}`}
                  onPointerDown={(e) => {
                    if (!selected) return;
                    const pt = pointFrom(e.clientX, e.clientY);
                    if (pt) startDrag({ kind: "area-move", id: m.id, startX: 0, startY: 0, moved: false, px: pt.x, py: pt.y, orig: m })(e);
                  }}
                  onClick={selectJob(m.id)}
                  sx={{
                    position: "absolute",
                    left: `${a.x * 100}%`,
                    top: `${a.y * 100}%`,
                    width: `${a.w * 100}%`,
                    height: `${a.h * 100}%`,
                    bgcolor: alpha(color, selected ? 0.35 : dimmed ? 0.1 : 0.22),
                    border: `${selected ? 3 : 2}px ${selected ? "dashed" : "solid"} ${alpha(color, dimmed ? 0.5 : 1)}`,
                    borderRadius: 0.5,
                    zIndex: selected ? 6 : 4,
                    // edit mode: only the selected job's area is grabbable, so drawing over others still works
                    pointerEvents: canEdit && !selected ? "none" : "auto",
                    cursor: canEdit ? "move" : "pointer",
                  }}
                >
                  {canEdit && selected ? (
                    <Box
                      onPointerDown={startDrag({ kind: "area-resize", id: m.id, startX: 0, startY: 0, moved: false, area: a })}
                      sx={{ position: "absolute", right: -8, bottom: -8, width: 16, height: 16, bgcolor: "#fff", border: `3px solid ${color}`, borderRadius: 0.5, cursor: "nwse-resize" }}
                    />
                  ) : null}
                </Box>
              );
            })}

            {/* Free-shape areas + the shape being drawn */}
            <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 5 }} viewBox="0 0 1000 1000" preserveAspectRatio="none">
              {markers.map((m) => {
                if (!m.polygon || m.polygon.length < 3) return null;
                const color = colors.get(m.contractorCode) ?? FALLBACK_MAP_COLOR;
                const selected = m.id === activeMarkerId;
                const dimmed = Boolean(active) && !selected;
                return (
                  <polygon
                    key={`poly-${m.id}`}
                    points={m.polygon.map((q) => `${q.x * 1000},${q.y * 1000}`).join(" ")}
                    fill={color}
                    fillOpacity={selected ? 0.35 : dimmed ? 0.1 : 0.22}
                    stroke={color}
                    strokeOpacity={dimmed ? 0.5 : 1}
                    strokeWidth={selected ? 3 : 2}
                    strokeDasharray={selected ? "8 5" : undefined}
                    vectorEffect="non-scaling-stroke"
                    // edit mode: only the selected job's shape is grabbable, so drawing over others still works
                    style={{ pointerEvents: canEdit && (!selected || poly.length > 0) ? "none" : "auto", cursor: canEdit ? "move" : "pointer" }}
                    onPointerDown={(e) => {
                      if (!selected) return;
                      const pt = pointFrom(e.clientX, e.clientY);
                      if (pt) startDrag({ kind: "poly-move", id: m.id, startX: 0, startY: 0, moved: false, px: pt.x, py: pt.y, orig: m })(e);
                    }}
                    onClick={selectJob(m.id)}
                  />
                );
              })}
              {poly.length > 0 ? (
                <polyline
                  points={[...poly, ...(hover ? [hover] : [])].map((q) => `${q.x * 1000},${q.y * 1000}`).join(" ")}
                  fill={colorOf(activeCode)}
                  fillOpacity={0.18}
                  stroke={colorOf(activeCode)}
                  strokeWidth={2.5}
                  strokeDasharray="6 4"
                  vectorEffect="non-scaling-stroke"
                />
              ) : null}
            </svg>
            {poly.map((q, i) => (
              <Box
                key={`corner-${i}`}
                sx={{
                  position: "absolute",
                  left: `${q.x * 100}%`,
                  top: `${q.y * 100}%`,
                  width: i === 0 ? 16 : 10,
                  height: i === 0 ? 16 : 10,
                  transform: "translate(-50%, -50%)",
                  borderRadius: "50%",
                  bgcolor: "#fff",
                  border: `3px solid ${colorOf(activeCode)}`,
                  zIndex: 9,
                  pointerEvents: "none",
                }}
              />
            ))}
            {/* Corner handles of the selected free shape (edit mode) */}
            {canEdit && active?.polygon && poly.length === 0
              ? active.polygon.map((q, i, points) => (
                  <Box
                    key={`vertex-${i}`}
                    onPointerDown={startDrag({ kind: "vertex", id: active.id, startX: 0, startY: 0, moved: false, index: i, points })}
                    onClick={(e) => e.stopPropagation()}
                    sx={{
                      position: "absolute",
                      left: `${q.x * 100}%`,
                      top: `${q.y * 100}%`,
                      width: 14,
                      height: 14,
                      transform: "translate(-50%, -50%)",
                      borderRadius: 0.5,
                      bgcolor: "#fff",
                      border: `3px solid ${colorOf(active.contractorCode)}`,
                      zIndex: 24,
                      cursor: "grab",
                    }}
                  />
                ))
              : null}

            {draft ? (
              <Box
                sx={{
                  position: "absolute",
                  left: `${draft.x * 100}%`,
                  top: `${draft.y * 100}%`,
                  width: `${draft.w * 100}%`,
                  height: `${draft.h * 100}%`,
                  bgcolor: alpha(colorOf(activeCode), 0.22),
                  border: `2px dashed ${colorOf(activeCode)}`,
                  zIndex: 7,
                  pointerEvents: "none",
                }}
              />
            ) : null}

            {/* Leader lines icon → title */}
            <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 8 }} viewBox="0 0 1000 1000" preserveAspectRatio="none">
              {markers.map((m) => (
                <line
                  key={m.id}
                  x1={m.targetX * 1000}
                  y1={m.targetY * 1000}
                  x2={m.boxX * 1000}
                  y2={m.boxY * 1000}
                  stroke={colors.get(m.contractorCode) ?? FALLBACK_MAP_COLOR}
                  strokeOpacity={active && m.id !== activeMarkerId ? 0.4 : 1}
                  strokeWidth={m.id === activeMarkerId ? 3.5 : 2.5}
                />
              ))}
            </svg>

            {/* Icons */}
            {markers.map((m) => {
              const color = colors.get(m.contractorCode) ?? FALLBACK_MAP_COLOR;
              const selected = m.id === activeMarkerId;
              return (
                <Box
                  key={`pin-${m.id}`}
                  onPointerDown={startDrag({ kind: "target", id: m.id, startX: 0, startY: 0, moved: false })}
                  onClick={selectJob(m.id)}
                  sx={{ position: "absolute", left: `${m.targetX * 100}%`, top: `${m.targetY * 100}%`, transform: "translate(-50%, -50%)", zIndex: selected ? 25 : 12, cursor: "pointer" }}
                >
                  <Box
                    sx={{
                      width: { xs: 56, md: 68 },
                      height: { xs: 56, md: 68 },
                      borderRadius: "50%",
                      bgcolor: "#fff",
                      backgroundImage: `linear-gradient(${alpha(color, 0.16)}, ${alpha(color, 0.16)})`,
                      border: `5px solid ${color}`,
                      boxShadow: selected ? `0 0 0 7px ${alpha(color, 0.4)}, 0 6px 18px rgba(0,0,0,0.35)` : "0 4px 14px rgba(0,0,0,0.3)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: { xs: 28, md: 36 },
                      position: "relative",
                      opacity: active && !selected ? 0.75 : 1,
                      transition: "transform 0.15s ease",
                      "&:hover": { transform: "scale(1.1)" },
                    }}
                  >
                    {emojiOf(m.icon)}
                    <Box sx={{ position: "absolute", bottom: -12, px: 0.9, borderRadius: 99, bgcolor: color, color: "#fff", fontSize: 11, fontWeight: 800, whiteSpace: "nowrap", boxShadow: "0 2px 6px rgba(0,0,0,0.3)", pointerEvents: "none" }}>
                      {m.contractorCode}
                      {m.comment ? " 💬" : ""}
                    </Box>
                  </Box>
                </Box>
              );
            })}

            {/* Short titles (comment appears here only with "show all") */}
            {markers.map((m) => {
              const color = colors.get(m.contractorCode) ?? FALLBACK_MAP_COLOR;
              const selected = m.id === activeMarkerId;
              return (
                <Box
                  key={`box-${m.id}`}
                  onPointerDown={startDrag({ kind: "box", id: m.id, startX: 0, startY: 0, moved: false })}
                  onClick={selectJob(m.id)}
                  sx={{ position: "absolute", left: `${m.boxX * 100}%`, top: `${m.boxY * 100}%`, transform: "translate(-50%, -50%)", zIndex: selected ? 26 : 15, cursor: canEdit ? "grab" : "pointer" }}
                >
                  <Box
                    sx={{
                      bgcolor: "#fff",
                      border: `2px solid ${color}`,
                      borderLeft: `5px solid ${color}`,
                      borderRadius: 1,
                      px: 0.9,
                      py: 0.3,
                      maxWidth: showAll ? 240 : 180,
                      boxShadow: selected ? 5 : 1,
                      opacity: active && !selected ? 0.75 : 1,
                    }}
                  >
                    <Typography sx={{ fontSize: 12, fontWeight: 700, lineHeight: 1.3, color: "#0F172A", whiteSpace: showAll ? "normal" : "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {m.text}
                    </Typography>
                    {showAll && m.comment ? (
                      <Typography sx={{ fontSize: 11, lineHeight: 1.35, color: "#334155", mt: 0.25, whiteSpace: "pre-line" }}>{m.comment}</Typography>
                    ) : null}
                  </Box>
                </Box>
              );
            })}

            {/* Popup for the clicked job (one at a time) */}
            {active ? (
              <Paper
                elevation={8}
                {...stopAll}
                sx={{
                  position: "absolute",
                  left: `${Math.min(0.82, Math.max(0.18, active.targetX)) * 100}%`,
                  top: `${active.targetY * 100}%`,
                  transform: active.targetY > 0.55 ? "translate(-50%, calc(-100% - 48px))" : "translate(-50%, 48px)",
                  width: 280,
                  zIndex: 40,
                  borderTop: `5px solid ${colorOf(active.contractorCode)}`,
                  cursor: "default",
                }}
              >
                <Stack direction="row" alignItems="flex-start" spacing={1} sx={{ p: 1.5, pb: 1 }}>
                  <Box sx={{ fontSize: 26, lineHeight: 1 }}>{emojiOf(active.icon)}</Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="caption" sx={{ fontWeight: 800, color: colorOf(active.contractorCode) }}>
                      {active.contractorCode} · {active.contractorName}
                    </Typography>
                    <Typography sx={{ fontWeight: 800, fontSize: 14, lineHeight: 1.3 }}>{active.text}</Typography>
                  </Box>
                  <IconButton size="small" aria-label="ปิด" onClick={() => onSelectMarker(null)} sx={{ mt: -0.5, mr: -0.5 }}>
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Stack>
                <Box sx={{ px: 1.5, pb: 1.25 }}>
                  <Typography variant="body2" sx={{ whiteSpace: "pre-line", color: active.comment ? "text.primary" : "text.secondary" }}>
                    {active.comment || "ไม่มีหมายเหตุ"}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.75 }}>
                    {active.area || active.polygon ? "พื้นที่ใช้งาน: แสดงเป็นกรอบสีบนผัง" : "ยังไม่ได้ระบุพื้นที่ใช้งาน"}
                  </Typography>
                </Box>
                {canEdit ? (
                  <Stack direction="row" spacing={0.5} sx={{ px: 1, pb: 1, flexWrap: "wrap" }}>
                    <Button size="small" startIcon={<EditOutlinedIcon fontSize="small" />} onClick={() => openEdit(active)}>
                      แก้ไข
                    </Button>
                    {active.area || active.polygon ? (
                      <Button size="small" color="inherit" onClick={() => onUpdateCallout?.(active.id, { area: undefined, polygon: undefined })}>
                        เอาพื้นที่ออก
                      </Button>
                    ) : (
                      <Button size="small" startIcon={<CropSquareOutlinedIcon fontSize="small" />} onClick={() => addAreaTo(active)}>
                        เพิ่มพื้นที่
                      </Button>
                    )}
                    <Box sx={{ flex: 1 }} />
                    <Button size="small" color="error" startIcon={<DeleteOutlineIcon fontSize="small" />} onClick={() => setDeleteTarget(active)}>
                      ลบ
                    </Button>
                  </Stack>
                ) : null}
              </Paper>
            ) : null}
          </Box>
        </Box>
      </Box>

      {/* Edit job */}
      <Dialog open={Boolean(editing)} onClose={closeEdit} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ pb: 1, fontWeight: 700, fontSize: 16 }}>รายละเอียดงานบนผัง</DialogTitle>
        <DialogContent dividers>
          {editing ? (
            <Stack spacing={2} sx={{ pt: 1 }}>
              <TextField
                label="หัวข้อสั้น (แสดงบนผัง)"
                fullWidth
                size="small"
                value={editing.text}
                onChange={(e) => setEditing({ ...editing, text: e.target.value.slice(0, MAP_TITLE_MAX) })}
                helperText={`${editing.text.length}/${MAP_TITLE_MAX} — เช่น จุดจอดเครน 25T`}
                autoFocus
              />
              <TextField
                label="หมายเหตุ (ซ่อนไว้ กดไอคอนเพื่อดู)"
                fullWidth
                size="small"
                multiline
                minRows={3}
                value={editing.comment}
                onChange={(e) => setEditing({ ...editing, comment: e.target.value.slice(0, 500) })}
                placeholder="เช่น ยก A Frame 09:00–12:00, ปิดถนน R2 ชั่วคราว"
              />
              {contractorSelect(editing.contractorCode, (code) => setEditing({ ...editing, contractorCode: code }), "map-contractor-dialog")}
              <Stack direction="row" flexWrap="wrap" gap={0.75}>
                {SITE_ICONS.map((it) => (
                  <Chip
                    key={it.type}
                    label={`${it.emoji} ${it.label}`}
                    onClick={() => setEditing({ ...editing, icon: it.type })}
                    color={editing.icon === it.type ? "primary" : "default"}
                    variant={editing.icon === it.type ? "filled" : "outlined"}
                    sx={{ fontWeight: 600 }}
                  />
                ))}
              </Stack>
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={closeEdit} color="inherit" size="small">
            ยกเลิก
          </Button>
          <Button onClick={saveEdit} variant="contained" size="small" disabled={!editing?.text.trim()}>
            บันทึก
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ pb: 1, fontWeight: 800, fontSize: 17 }}>ลบงานนี้ออกจากผัง?</DialogTitle>
        <DialogContent sx={{ py: 1.5 }}>
          {deleteTarget ? (
            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, borderLeft: `5px solid ${colorOf(deleteTarget.contractorCode)}` }}>
              <Typography variant="body2" sx={{ fontWeight: 800 }}>
                {emojiOf(deleteTarget.icon)} {deleteTarget.contractorCode} · {deleteTarget.text}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                ไอคอน หมายเหตุ และพื้นที่ของงานนี้จะถูกลบทั้งหมด
              </Typography>
            </Paper>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button onClick={() => setDeleteTarget(null)} color="inherit" variant="outlined">
            ยกเลิก
          </Button>
          <Button
            onClick={() => {
              if (deleteTarget) onDeleteCallout?.(deleteTarget.id);
              setDeleteTarget(null);
            }}
            color="error"
            variant="contained"
            startIcon={<DeleteOutlineIcon />}
            autoFocus
          >
            ยืนยันการลบ
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

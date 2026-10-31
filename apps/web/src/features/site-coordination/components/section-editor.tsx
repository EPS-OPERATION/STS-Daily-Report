import ArrowBackOutlined from "@mui/icons-material/ArrowBackOutlined";
import CheckOutlined from "@mui/icons-material/CheckOutlined";
import CloseOutlined from "@mui/icons-material/CloseOutlined";
import DeleteOutlineOutlined from "@mui/icons-material/DeleteOutlineOutlined";
import InfoOutlined from "@mui/icons-material/InfoOutlined";
import RestartAltOutlined from "@mui/icons-material/RestartAltOutlined";
import RouteOutlined from "@mui/icons-material/RouteOutlined";
import UndoOutlined from "@mui/icons-material/UndoOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import IconButton from "@mui/material/IconButton";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import { routeGeometryError, type CoordinationMap, type CoordinationPoint, type CoordinationSection } from "@sts/shared";
import { useEffect, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog.js";
import { HttpError } from "@/services/http/client.js";
import { useDeleteSection, useSaveSection } from "../hooks/use-coordination.js";
import { nextSectionCode, nextSectionColor, SECTION_COLORS, sectionMarkers, snapToSectionEnd } from "../utils/sections.js";
import { RoadMapStage, type MapDot, type RoadLine } from "./road-map-stage.js";

/** A section being drawn or edited. */
type Form = { code: string; work: string; color: string; points: CoordinationPoint[] };
const fail = (e: unknown) => toast.error(e instanceof HttpError ? e.message : "บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง");

// Draw and reshape a map's route sections (e.g. the 33 kV line A-B … G-H) directly on the drawing:
// tap along the route, drag the points, set code/work/colour. Used by the Route sections page and by the
// admin-only drawing dialog on the Map page.
export function SectionEditor({
  projectId,
  map,
  sections,
  fill = false,
}: {
  projectId: string | null;
  map: CoordinationMap;
  /** Sections of THIS map only. */
  sections: CoordinationSection[];
  /** true: fill the parent (dialog); false: the page card with its own viewport height. */
  fill?: boolean;
}) {
  const theme = useTheme();
  const wide = useMediaQuery(theme.breakpoints.up("md"));
  const save = useSaveSection(projectId);
  const remove = useDeleteSection(projectId);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [form, setForm] = useState<Form | null>(null);
  const [focus, setFocus] = useState<{ key: number; points: CoordinationPoint[] } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isNew = form !== null && selectedId === null;
  const radius = Math.max(map.width, map.height) * 0.01;
  // A line starts/ends exactly on the end of its neighbour, so A-B and B-C meet at B.
  const magnet = (p: CoordinationPoint) => snapToSectionEnd(sections, p, map, radius, selectedId);
  const flyTo = (points: CoordinationPoint[]) => setFocus({ key: Date.now(), points });

  const reset = () => { setDrawing(false); setSelectedId(null); setForm(null); };
  // Esc leaves the current mode — cancel drawing, or close the edit form back to the list (same as the Cancel
  // buttons). Window capture, so it also beats the drawing dialog's own Esc-close while a draft is open.
  // Skipped while typing (blur first) and while the delete confirm is open (that dialog handles its own Esc).
  useEffect(() => {
    if (!drawing && !form) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || confirmDelete) return;
      const t = e.target as HTMLElement | null;
      if (t && ["INPUT", "TEXTAREA"].includes(t.tagName)) return;
      e.preventDefault();
      e.stopPropagation();
      reset();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [drawing, Boolean(form), confirmDelete]);
  const pick = (s: CoordinationSection) => {
    setDrawing(false); setSelectedId(s.id);
    setForm({ code: s.code, work: s.work, color: s.color, points: s.points });
    flyTo(s.points);
  };
  const startNew = () => {
    setSelectedId(null); setDrawing(true);
    setForm({ code: nextSectionCode(sections.map((s) => s.code)), work: "", color: nextSectionColor(sections.map((s) => s.color)), points: [] });
  };
  // Tapping empty map deselects (unsaved edits stay, with a reminder, so a stray tap never drops work).
  const tapBlank = () => {
    if (!form) return;
    if (selectedId === null) return;
    const s = sections.find((v) => v.id === selectedId);
    const dirty = !s || s.code !== form.code || s.work !== form.work || s.color !== form.color || JSON.stringify(s.points) !== JSON.stringify(form.points);
    if (dirty) { toast.info("มีการแก้ไขที่ยังไม่บันทึก — กด Save หรือ Cancel", { id: "section-unsaved" }); return; }
    reset();
  };

  const pointsError = form ? routeGeometryError(form.points) : null;
  const escBlur = (e: ReactKeyboardEvent) => {
    if (e.key !== "Escape") return;
    e.preventDefault();
    (e.target as HTMLElement).blur();
  };
  const codeTaken = form ? sections.some((s) => s.id !== selectedId && s.code.trim().toLowerCase() === form.code.trim().toLowerCase()) : false;
  const ready = Boolean(form && form.code.trim() && form.work.trim() && !pointsError && !codeTaken);
  const n = form?.points.length ?? 0;

  const submit = async () => {
    if (!form) return;
    try {
      const res = await save.mutateAsync({ input: { mapId: map.id, code: form.code.trim(), work: form.work.trim(), color: form.color, points: form.points }, id: selectedId ?? undefined });
      toast.success(selectedId ? "บันทึกช่วงแล้ว" : "เพิ่มช่วงแล้ว");
      pick(res.data);
    } catch (e) { fail(e); }
  };
  const destroy = async () => {
    if (!selectedId) return;
    try { await remove.mutateAsync(selectedId); toast.success("ลบช่วงแล้ว"); setConfirmDelete(false); reset(); } catch (e) { fail(e); }
  };

  const lines: RoadLine[] = sections.map((s) => ({
    id: s.id,
    points: s.id === selectedId && form ? form.points : s.points,
    color: s.id === selectedId && form ? form.color : s.color,
    label: s.code,
    emphasis: s.id === selectedId,
    muted: drawing || Boolean(selectedId && s.id !== selectedId) || (isNew && !drawing),
  }));
  if (isNew && !drawing && form && form.points.length >= 2) lines.push({ id: "new-section", points: form.points, color: form.color, emphasis: true, passive: true, label: form.code.trim() || "ช่วงใหม่" });
  const dots: MapDot[] = sectionMarkers(sections).map((m) => ({ id: `end-${m.label}`, point: m.point, active: true, label: m.label }));

  return (
    <>
      <Card sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1fr) 360px" }, gridTemplateRows: { md: "minmax(0, 1fr)" }, overflow: "hidden",
        ...(fill ? { height: "100%", minHeight: 0 } : { height: { md: "calc(100dvh - 210px)" }, minHeight: { md: 520 } }) }}>
        <Box sx={{ minWidth: 0, minHeight: 0, borderRight: { md: 1 }, borderColor: "divider", display: "flex", flexDirection: "column" }}>
          <RoadMapStage
            key={map.id}
            map={map}
            lines={lines}
            dots={dots}
            selectedId={selectedId}
            height={wide ? "fill" : 420}
            draft={drawing ? form?.points : null}
            editPoints={!drawing && form ? form.points : null}
            snapPreview={magnet}
            focus={focus}
            onTapMap={drawing ? (p) => setForm((f) => f && { ...f, points: [...f.points, magnet(p)] }) : tapBlank}
            onTapLine={drawing ? undefined : (id) => { const s = sections.find((v) => v.id === id); if (s) pick(s); }}
            onMovePoint={(i, p) => setForm((f) => f && { ...f, points: f.points.map((v, j) => (j === i ? magnet(p) : v)) })}
            onInsertPoint={(i, p) => setForm((f) => f && { ...f, points: [...f.points.slice(0, i + 1), magnet(p), ...f.points.slice(i + 1)] })}
          >
            {drawing ? <>
              <Stack direction="row" spacing={0.75} alignItems="center" sx={{ position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)", zIndex: 30, maxWidth: "calc(100% - 24px)",
                px: 1.5, py: 0.75, bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: 999, pointerEvents: "none" }}>
                <RouteOutlined fontSize="small" color="primary" />
                <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                  {n === 0 ? "แตะจุดเริ่มของช่วง (ต่อจากปลายช่วงก่อนหน้าได้)" : n < 2 ? "แตะต่อตามแนวเส้นทาง" : "แตะต่อ หรือกด Done เมื่อถึงปลายช่วง"}
                </Typography>
              </Stack>
              <Paper elevation={6} sx={{ position: "absolute", bottom: 14, left: "50%", transform: "translateX(-50%)", zIndex: 31, p: 0.75, borderRadius: 999, display: "flex", gap: 0.75, alignItems: "center", maxWidth: "calc(100% - 24px)" }}>
                <Tooltip title="Cancel"><IconButton aria-label="Cancel drawing" onClick={reset}><CloseOutlined /></IconButton></Tooltip>
                <Button variant="outlined" color="inherit" startIcon={<UndoOutlined />} disabled={!n} sx={{ borderRadius: 999, borderColor: "divider", whiteSpace: "nowrap" }}
                  onClick={() => setForm((f) => f && { ...f, points: f.points.slice(0, -1) })}>Undo</Button>
                <Tooltip title="Start over"><span><IconButton aria-label="Start over" disabled={!n} onClick={() => setForm((f) => f && { ...f, points: [] })}><RestartAltOutlined /></IconButton></span></Tooltip>
                <Button variant="contained" disableElevation startIcon={<CheckOutlined />} disabled={n < 2 || Boolean(pointsError)} onClick={() => setDrawing(false)} sx={{ borderRadius: 999, px: 2.25, whiteSpace: "nowrap" }}>
                  Done{n ? ` · ${n} จุด` : ""}
                </Button>
              </Paper>
            </> : !form ? (
              <Button variant="contained" size="large" startIcon={<RouteOutlined />} onClick={startNew} sx={{ position: "absolute", left: 12, bottom: 12, zIndex: 30, boxShadow: 3 }}>Add section</Button>
            ) : null}
          </RoadMapStage>
        </Box>
        <Stack sx={{ minWidth: 0, minHeight: 0 }}>
          {form && !drawing ? (
            <Stack sx={{ flex: 1, minHeight: 0 }}>
              <Stack direction="row" alignItems="center" spacing={0.75} sx={{ px: 1, py: 1, borderBottom: 1, borderColor: "divider" }}>
                <Tooltip title="Back to sections"><IconButton aria-label="Back to sections" onClick={reset}><ArrowBackOutlined /></IconButton></Tooltip>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{isNew ? "New section" : `Edit section ${sections.find((s) => s.id === selectedId)?.code ?? ""}`}</Typography>
              </Stack>
              <Stack spacing={2.5} sx={{ p: 2, overflowY: "auto", flex: 1, minHeight: 0 }}>
                {/* Esc in a field blurs it (the window Esc-close is skipped while typing); the next Esc closes the form. */}
                <TextField size="small" label="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} fullWidth autoFocus
                  error={codeTaken} helperText={codeTaken ? "มีรหัสนี้บนผังนี้แล้ว" : "เช่น A-B — ตัวอักษรหน้า/หลังขีดจะแสดงเป็นหมุดที่ปลายช่วง"} slotProps={{ htmlInput: { maxLength: 20 } }}
                  onKeyDown={escBlur} />
                <TextField size="small" label="Work in this section" placeholder="เช่น งานฐานราก งานติดตั้งรางสายไฟบนโครงพัก" value={form.work} onChange={(e) => setForm({ ...form, work: e.target.value })} fullWidth multiline minRows={2} maxRows={5}
                  helperText={`${form.work.length}/300`} slotProps={{ htmlInput: { maxLength: 300 } }} onKeyDown={escBlur} />
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", display: "block", mb: 0.75 }}>Colour</Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap role="radiogroup" aria-label="Section colour">
                    {SECTION_COLORS.map((c) => {
                      const on = form.color.toUpperCase() === c;
                      return <Box key={c} component="button" type="button" role="radio" aria-checked={on} aria-label={c} onClick={() => setForm({ ...form, color: c })}
                        sx={{ width: 30, height: 30, borderRadius: "50%", bgcolor: c, cursor: "pointer", border: "3px solid", borderColor: on ? "text.primary" : "background.paper", boxShadow: on ? 0 : "0 0 0 1px rgba(15,23,42,.18)", p: 0 }} />;
                    })}
                  </Stack>
                </Box>
                <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ color: pointsError ? "warning.dark" : "text.secondary" }}>
                  <InfoOutlined sx={{ fontSize: 18, mt: "1px" }} />
                  <Typography variant="caption">{pointsError ?? `${n} จุด · ลากจุดกลมเพื่อปรับแนว · แตะจุด + กลางเส้นเพื่อเพิ่มจุด — ปลายใกล้ช่วงอื่นจะต่อกันให้เอง · Esc เพื่อยกเลิก`}</Typography>
                </Stack>
              </Stack>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ p: 1.5, borderTop: 1, borderColor: "divider" }}>
                {!isNew ? <Button variant="text" color="error" startIcon={<DeleteOutlineOutlined />} onClick={() => setConfirmDelete(true)}>Delete</Button> : null}
                <Box sx={{ flex: 1 }} />
                <Button variant="text" color="inherit" onClick={reset}>Cancel</Button>
                <Button variant="contained" disableElevation disabled={!ready || save.isPending} onClick={() => void submit()}>Save</Button>
              </Stack>
            </Stack>
          ) : <>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2, py: 1.25, borderBottom: 1, borderColor: "divider" }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Sections ({sections.length})</Typography>
              <Button size="small" variant="outlined" startIcon={<RouteOutlined />} onClick={startNew} disabled={drawing}>Add section</Button>
            </Stack>
            {drawing ? <Typography variant="caption" color="text.secondary" sx={{ px: 2, py: 1, bgcolor: "action.hover" }}>กำลังวาด — กด Done บนผังเมื่อวาดเสร็จ</Typography> : null}
            <Box sx={{ overflowY: "auto", flex: 1, minHeight: 0, maxHeight: { xs: 460, md: "none" } }}>
              {sections.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 2 }}>
                  ยังไม่มีช่วงบนผังนี้ — กด «Add section» แล้วแตะตามแนวเส้นทางจากจุดเริ่มถึงปลายช่วง
                </Typography>
              ) : sections.map((s) => (
                <ListItemButton key={s.id} onClick={() => pick(s)} sx={{ borderBottom: 1, borderColor: "divider", alignItems: "flex-start" }}>
                  <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: s.color, mr: 1.5, mt: 0.75, flexShrink: 0 }} />
                  <ListItemText primary={<b>{s.code}</b>} secondary={s.work} slotProps={{ secondary: { sx: { whiteSpace: "pre-line" } } }} />
                </ListItemButton>
              ))}
            </Box>
          </>}
        </Stack>
      </Card>
      <ConfirmDialog
        open={confirmDelete}
        title="ลบช่วงนี้?"
        description={`ช่วง ${form?.code ?? ""} จะหายจากผัง งานที่เคยเลือกช่วงนี้ยังอยู่ แต่จะไม่ระบุช่วง`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        loading={remove.isPending}
        onConfirm={() => void destroy()}
        onClose={() => setConfirmDelete(false)}
      />
    </>
  );
}

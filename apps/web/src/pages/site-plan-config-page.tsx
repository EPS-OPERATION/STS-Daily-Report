import AddIcon from "@mui/icons-material/Add";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import MenuItem from "@mui/material/MenuItem";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";
import { useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { PageHeader } from "@/components/ui/page-header.js";
import { useCurrentProject } from "@/features/projects/index.js";
import {
  SITE_MAP_IMAGES,
  SITE_MAP_VIEW_LIST,
  SiteMapImage,
  useSiteMap,
  useSiteMapWriter,
  type MapMarker,
  type MapPoint,
  type PartInput,
  type SiteMapBuilding,
  type SiteMapView,
} from "@/features/site-plan/index.js";
import { HttpError } from "@/services/http/client.js";

type PartDraft = PartInput & { id: string | null };
const VIEW_LABEL: Record<SiteMapView, string> = { overview: "Overview", topview: "Top view", plan: "Plan" };

// Admin site-map configuration (deck v2, "admin config map"):
// Map → Facility marker (per view) → optional Work Parts with their own markers.
export function SitePlanConfigPage() {
  const theme = useTheme();
  const { projectId } = useCurrentProject();
  const map = useSiteMap(projectId);
  const writer = useSiteMapWriter(projectId);

  const [view, setView] = useState<SiteMapView>("overview");
  const [search, setSearch] = useState("");
  const [buildingId, setBuildingId] = useState<string | null>(null);
  const [mode, setMode] = useState<"building" | "parts">("building");
  const [pendingPoint, setPendingPoint] = useState<MapPoint | null>(null); // building marker, unsaved
  const [part, setPart] = useState<PartDraft | null>(null); // selected / new work part, editable copy
  const [partPoint, setPartPoint] = useState<MapPoint | null>(null); // part marker, unsaved
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buildings = map.data?.data ?? [];
  const building = buildings.find((b) => b.id === buildingId) ?? null;
  const savedPart = building?.parts.find((p) => p.id === part?.id) ?? null;
  const partDirty =
    part !== null &&
    (part.id === null ||
      part.code !== savedPart?.code ||
      part.name !== savedPart?.name ||
      part.status !== savedPart?.status ||
      partPoint !== null);
  const dirty = mode === "building" ? pendingPoint !== null : partDirty;
  const configured = buildings.filter((b) => b.markers[view]).length;
  const filtered = buildings.filter((b) => {
    const q = search.trim().toLowerCase();
    return !q || b.name.toLowerCase().includes(q) || b.code.toLowerCase().includes(q) || (b.nameTh ?? "").includes(q);
  });

  const confirmDiscard = () => !dirty || window.confirm("มีการแก้ไขที่ยังไม่บันทึก — ทิ้งการแก้ไขนี้?");
  const discard = () => {
    setPendingPoint(null);
    setPartPoint(null);
    setError(null);
    if (part) setPart(savedPart ? { id: savedPart.id, code: savedPart.code, name: savedPart.name, status: savedPart.status } : null);
  };
  const chooseBuilding = (id: string) => {
    if (id === buildingId || !confirmDiscard()) return;
    discard();
    setPart(null);
    setMode("building");
    setBuildingId(id);
  };
  const chooseView = (v: SiteMapView) => {
    if (!confirmDiscard()) return;
    setPendingPoint(null);
    setPartPoint(null);
    setView(v);
  };
  const choosePart = (p: SiteMapBuilding["parts"][number]) => {
    if (!confirmDiscard()) return;
    setPartPoint(null);
    setPart({ id: p.id, code: p.code, name: p.name, status: p.status });
  };
  const newPart = (b: SiteMapBuilding) => {
    const used = new Set(b.parts.map((p) => p.code));
    const letter = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").find((l) => !used.has(l)) ?? String(b.parts.length + 1);
    setPartPoint(null);
    setPart({ id: null, code: letter, name: `Part ${letter}`, status: "active" });
  };

  const run = async (fn: () => Promise<void>) => {
    setSaving(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof HttpError ? e.message : "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  const save = (andNext: boolean) =>
    run(async () => {
      if (!building) return;
      if (mode === "building") {
        let latest = buildings;
        if (pendingPoint) latest = await writer.setBuildingMarker(building.id, view, pendingPoint);
        setPendingPoint(null);
        if (andNext) {
          // next facility (site order) still without a marker in this view
          const idx = latest.findIndex((b) => b.id === building.id);
          const next = [...latest.slice(idx + 1), ...latest.slice(0, idx)].find((b) => !b.markers[view]);
          if (next) setBuildingId(next.id);
        }
        return;
      }
      if (!part) return;
      const input = { code: part.code.trim(), name: part.name.trim(), status: part.status };
      if (!input.code || !input.name) throw new Error("ระบุชื่อและรหัส Part");
      let id = part.id;
      if (id === null) id = await writer.createPart(building.id, input);
      else if (partDirty) await writer.updatePart(id, input);
      if (partPoint) await writer.setPartMarker(id, view, partPoint);
      setPartPoint(null);
      if (andNext) newPart(building);
      else setPart({ id, ...input });
    });

  // ---- map markers ----
  const markers: MapMarker[] =
    mode === "building"
      ? buildings.flatMap((b) => {
          const isSel = b.id === buildingId;
          const point = isSel && pendingPoint ? pendingPoint : b.markers[view];
          if (!point) return [];
          return [
            {
              id: b.id,
              kind: "building" as const,
              label: b.code,
              title: b.name,
              point,
              selected: isSel,
              draggable: isSel,
              tone: isSel ? { bg: theme.palette.primary.main, fg: theme.palette.common.white } : undefined,
            },
          ];
        })
      : building
        ? [
            ...(building.markers[view]
              ? [{ id: building.id, kind: "building" as const, label: building.code, title: building.name, point: building.markers[view]!, dimmed: true }]
              : []),
            ...building.parts.flatMap((p) => {
              const isSel = p.id === part?.id;
              const point = isSel && partPoint ? partPoint : p.markers[view];
              if (!point) return [];
              return [
                {
                  id: p.id,
                  kind: "part" as const,
                  label: isSel ? part!.code : p.code,
                  title: `${p.name}${p.status === "inactive" ? " (inactive)" : ""}`,
                  point,
                  selected: isSel,
                  draggable: isSel,
                  dimmed: p.status === "inactive",
                  tone: isSel ? { bg: theme.palette.primary.main, fg: theme.palette.common.white } : undefined,
                },
              ];
            }),
            ...(part && part.id === null && partPoint
              ? [{ id: "new", kind: "part" as const, label: part.code, title: part.name, point: partPoint, selected: true, draggable: true, tone: { bg: theme.palette.primary.main, fg: theme.palette.common.white } }]
              : []),
          ]
        : [];

  const canPlace = mode === "building" ? Boolean(building) : Boolean(part);
  const placeHint =
    mode === "building"
      ? building
        ? "คลิกบนแผนที่เพื่อวางหมุด · ลากหมุดเพื่อย้าย"
        : "เลือกอาคารจากรายการทางซ้าย"
      : part
        ? "คลิกบนแผนที่เพื่อวางหมุดของ Part นี้ · ลากเพื่อย้าย"
        : "เลือกหรือเพิ่ม Part ก่อน";

  const currentPoint = pendingPoint ?? building?.markers[view] ?? null;

  return (
    <Box sx={{ pb: 10 }}>
      <PageHeader
        title="Zone Configuration"
        subtitle="วางหมุดอาคาร (Facility marker) บนแผนที่ และแบ่ง Work Part ของแต่ละอาคาร"
        actions={
          <Button component={RouterLink} to="/site-plan" size="small" variant="text" startIcon={<ArrowBackIcon />}>
            กลับ Site Plan
          </Button>
        }
      />

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      ) : null}

      {!map.data ? (
        <Skeleton variant="rounded" height={520} />
      ) : (
        <Grid container spacing={2.5}>
          {/* ---------- left panel ---------- */}
          <Grid size={{ xs: 12, md: 4, lg: 3 }}>
            <Box sx={{ border: 1, borderColor: "divider", borderRadius: 2, bgcolor: "background.paper" }}>
              {mode === "building" ? (
                <>
                  <Box sx={{ p: 1.5, pb: 0.5 }}>
                    <TextField
                      size="small"
                      fullWidth
                      placeholder="ค้นหาอาคาร…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      slotProps={{
                        input: {
                          startAdornment: (
                            <InputAdornment position="start">
                              <SearchOutlinedIcon fontSize="small" />
                            </InputAdornment>
                          ),
                        },
                      }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                      {configured} / {buildings.length} configured ({VIEW_LABEL[view]})
                    </Typography>
                  </Box>
                  <List dense sx={{ maxHeight: 440, overflow: "auto" }}>
                    {filtered.map((b) => {
                      const idx = buildings.indexOf(b) + 1;
                      const anyPlaced = SITE_MAP_VIEW_LIST.some((v) => b.markers[v]);
                      return (
                        <ListItemButton key={b.id} selected={b.id === buildingId} onClick={() => chooseBuilding(b.id)}>
                          <ListItemIcon sx={{ minWidth: 30 }}>
                            {b.markers[view] ? (
                              <CheckCircleOutlineIcon fontSize="small" color="success" />
                            ) : anyPlaced ? (
                              <RadioButtonUncheckedIcon fontSize="small" color="disabled" />
                            ) : (
                              <WarningAmberOutlinedIcon fontSize="small" color="warning" />
                            )}
                          </ListItemIcon>
                          <ListItemText
                            primary={`${String(idx).padStart(2, "0")} ${b.name}`}
                            secondary={b.parts.length ? `${b.parts.length} work part` : undefined}
                          />
                        </ListItemButton>
                      );
                    })}
                  </List>
                  {building ? (
                    <Box sx={{ p: 1.5, pt: 0.5 }}>
                      <Accordion disableGutters variant="outlined" sx={{ borderRadius: 1.5, "&:before": { display: "none" } }}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                          <Typography variant="body2">Advanced zone settings</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                          <Typography variant="caption" color="text.secondary">
                            ตำแหน่งหมุดแบบละเอียด ({VIEW_LABEL[view]}) — % ของภาพ
                          </Typography>
                          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                            {(["x", "y"] as const).map((k) => (
                              <TextField
                                key={k}
                                size="small"
                                label={k.toUpperCase()}
                                value={currentPoint ? (currentPoint[k] * 100).toFixed(1) : ""}
                                onChange={(e) => {
                                  const n = Number.parseFloat(e.target.value);
                                  if (Number.isNaN(n)) return;
                                  const base = currentPoint ?? { x: 0.5, y: 0.5 };
                                  setPendingPoint({ ...base, [k]: Math.min(1, Math.max(0, n / 100)) });
                                }}
                                slotProps={{ input: { endAdornment: <InputAdornment position="end">%</InputAdornment> } }}
                              />
                            ))}
                          </Stack>
                          {building.markers[view] ? (
                            <Button
                              size="small"
                              color="error"
                              startIcon={<DeleteOutlineOutlinedIcon />}
                              sx={{ mt: 1 }}
                              disabled={saving}
                              onClick={() =>
                                window.confirm(`ลบหมุด ${building.name} ใน ${VIEW_LABEL[view]}?`) &&
                                run(async () => {
                                  await writer.setBuildingMarker(building.id, view, null);
                                  setPendingPoint(null);
                                })
                              }
                            >
                              ลบหมุดในมุมมองนี้
                            </Button>
                          ) : null}
                        </AccordionDetails>
                      </Accordion>
                      <Button
                        fullWidth
                        variant="outlined"
                        size="small"
                        endIcon={<ChevronRightIcon />}
                        sx={{ mt: 1.25, justifyContent: "space-between" }}
                        onClick={() => {
                          if (!confirmDiscard()) return;
                          setPendingPoint(null);
                          setMode("parts");
                          setPart(null);
                        }}
                      >
                        Work Parts configuration ({building.parts.length})
                      </Button>
                    </Box>
                  ) : null}
                </>
              ) : building ? (
                <Box sx={{ p: 1.5 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <IconButton
                      size="small"
                      aria-label="กลับไปรายการอาคาร"
                      onClick={() => {
                        if (!confirmDiscard()) return;
                        discard();
                        setPart(null);
                        setMode("building");
                      }}
                    >
                      <ArrowBackIcon fontSize="small" />
                    </IconButton>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 0.4 }}>
                        {building.name} · {building.code}
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 700 }}>
                        Work Parts · {building.parts.length}
                      </Typography>
                    </Box>
                  </Stack>
                  <Button
                    size="small"
                    startIcon={<AddIcon />}
                    sx={{ mt: 1.5 }}
                    onClick={() => confirmDiscard() && newPart(building)}
                  >
                    Add Part
                  </Button>
                  <List dense sx={{ mt: 1 }}>
                    {building.parts.map((p) => (
                      <ListItemButton key={p.id} selected={p.id === part?.id} onClick={() => choosePart(p)} sx={{ borderRadius: 1 }}>
                        <ListItemText
                          primary={p.name}
                          secondary={`${p.code} · ${p.status === "active" ? "Active" : "Inactive"}${p.markers[view] ? "" : ` · ยังไม่วางหมุด (${VIEW_LABEL[view]})`}`}
                        />
                      </ListItemButton>
                    ))}
                    {part && part.id === null ? (
                      <ListItemButton selected sx={{ borderRadius: 1 }}>
                        <ListItemText primary={`${part.name} (ใหม่)`} secondary={part.code} />
                      </ListItemButton>
                    ) : null}
                  </List>
                  {part ? (
                    <Stack spacing={1.5} sx={{ mt: 1.5, pt: 1.5, borderTop: 1, borderColor: "divider" }}>
                      <Stack direction="row" alignItems="center" justifyContent="space-between">
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {part.name || "Part"}
                        </Typography>
                        {part.id ? (
                          <IconButton
                            size="small"
                            aria-label="ลบ Part"
                            disabled={saving}
                            onClick={() =>
                              window.confirm(`ลบ ${part.name}?`) &&
                              run(async () => {
                                await writer.deletePart(part.id!);
                                setPart(null);
                                setPartPoint(null);
                              })
                            }
                          >
                            <DeleteOutlineOutlinedIcon fontSize="small" />
                          </IconButton>
                        ) : null}
                      </Stack>
                      <TextField size="small" label="Part name" value={part.name} onChange={(e) => setPart({ ...part, name: e.target.value })} />
                      <TextField
                        size="small"
                        label="Part code"
                        value={part.code}
                        onChange={(e) => setPart({ ...part, code: e.target.value.toUpperCase() })}
                      />
                      <TextField
                        select
                        size="small"
                        label="Status"
                        value={part.status}
                        onChange={(e) => setPart({ ...part, status: e.target.value as PartInput["status"] })}
                      >
                        <MenuItem value="active">Active</MenuItem>
                        <MenuItem value="inactive">Inactive</MenuItem>
                      </TextField>
                      <Box>
                        <Typography variant="caption" sx={{ fontWeight: 700 }}>
                          Location{" "}
                          <Typography component="span" variant="caption" color="text.secondary">
                            (optional)
                          </Typography>
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                          {partPoint || savedPart?.markers[view] ? `วางแล้วใน ${VIEW_LABEL[view]}` : "ยังไม่ได้วางหมุด"} — คลิกบนแผนที่เพื่อวาง
                          ลากหมุดเพื่อย้าย
                        </Typography>
                        {savedPart?.markers[view] && !partPoint ? (
                          <Button
                            size="small"
                            color="error"
                            disabled={saving}
                            onClick={() => run(async () => void (await writer.setPartMarker(savedPart.id, view, null)))}
                          >
                            ลบหมุดของ Part
                          </Button>
                        ) : null}
                      </Box>
                    </Stack>
                  ) : (
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                      Work Part คือส่วนย่อยของอาคาร (ไม่บังคับ) เช่น ฐานราก, Line A–D
                    </Typography>
                  )}
                </Box>
              ) : null}
            </Box>
          </Grid>

          {/* ---------- map ---------- */}
          <Grid size={{ xs: 12, md: 8, lg: 9 }}>
            <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1} sx={{ mb: 1.25 }}>
              <Box>
                <Typography variant="h5">{building ? `${String(buildings.indexOf(building) + 1).padStart(2, "0")} ${building.name}` : "เลือกอาคาร"}</Typography>
                {building ? (
                  <>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                      {building.code}
                      {building.nameTh ? ` · ${building.nameTh}` : ""}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {SITE_MAP_VIEW_LIST.map((v) => `${VIEW_LABEL[v]}: ${building.markers[v] ? "Placed" : "Not placed"}`).join(" · ")}
                    </Typography>
                  </>
                ) : null}
              </Box>
              <ToggleButtonGroup exclusive size="small" value={view} onChange={(_, v: SiteMapView | null) => v && chooseView(v)}>
                {SITE_MAP_VIEW_LIST.map((v) => (
                  <ToggleButton key={v} value={v}>
                    {SITE_MAP_IMAGES[v].label}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Stack>
            <SiteMapImage
              view={view}
              markers={markers}
              hint={placeHint}
              maxHeight="70vh"
              onMarkerClick={(id) => {
                if (mode === "building") chooseBuilding(id);
                else {
                  const p = building?.parts.find((x) => x.id === id);
                  if (p && p.id !== part?.id) choosePart(p);
                }
              }}
              onMarkerDrag={(_, point) => (mode === "building" ? setPendingPoint(point) : setPartPoint(point))}
              onPlace={canPlace ? (point) => (mode === "building" ? setPendingPoint(point) : setPartPoint(point)) : undefined}
            />
          </Grid>
        </Grid>
      )}

      {/* ---------- sticky action bar ---------- */}
      <Box
        sx={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: (t) => t.zIndex.appBar,
          bgcolor: "background.paper",
          borderTop: 1,
          borderColor: "divider",
          px: 3,
          py: 1.25,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1} sx={{ maxWidth: 1600, ml: "auto" }}>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {dirty ? "Unsaved changes" : "บันทึกแล้ว"}
            </Typography>
            {dirty ? (
              <Typography variant="caption" color="warning.dark">
                ● มีการแก้ไขที่ยังไม่บันทึก
              </Typography>
            ) : null}
          </Box>
          <Button variant="outlined" color="inherit" disabled={!dirty || saving} onClick={discard}>
            Cancel
          </Button>
          <Button disabled={!dirty || saving} onClick={() => void save(false)}>
            Save
          </Button>
          <Button variant="outlined" disabled={!dirty || saving} onClick={() => void save(true)}>
            Save &amp; Add Another
          </Button>
        </Stack>
      </Box>
    </Box>
  );
}

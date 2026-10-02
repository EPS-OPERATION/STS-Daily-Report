import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditIcon from "@mui/icons-material/Edit";
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
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import {
  CONTRACTOR_PALETTES,
  PRESET_COLORS,
  SITE_ICONS,
  type SiteCalloutMarker,
  type SiteIconType,
} from "../types/coordination.types.js";

const ZOOMS = [1, 1.25, 1.5, 2];
const clamp01 = (n: number) => Math.min(0.97, Math.max(0.03, Math.round(n * 10000) / 10000));

interface CoordinationMapBoardProps {
  markers: SiteCalloutMarker[];
  activeMarkerId: string | null;
  onSelectMarker: (id: string | null) => void;
  onUpdateTarget?: (id: string, targetX: number, targetY: number) => void;
  onUpdateBox?: (id: string, boxX: number, boxY: number) => void;
  onUpdateCallout?: (id: string, updates: Partial<SiteCalloutMarker>) => void;
  onDeleteCallout?: (id: string) => void;
  onAddCallout?: (item: Omit<SiteCalloutMarker, "id" | "createdAt">) => void;
  mapView: "plan" | "topview";
  onChangeMapView: (view: "plan" | "topview") => void;
  userContractorCode?: string;
  readOnly?: boolean;
}

export function CoordinationMapBoard({
  markers,
  activeMarkerId,
  onSelectMarker,
  onUpdateTarget,
  onUpdateBox,
  onUpdateCallout,
  onDeleteCallout,
  onAddCallout,
  mapView,
  onChangeMapView,
  userContractorCode,
  readOnly = false,
}: CoordinationMapBoardProps) {
  const [zoomIdx, setZoomIdx] = useState<number>(0);
  const zoom = ZOOMS[zoomIdx]!;
  const surfaceRef = useRef<HTMLDivElement>(null);

  // Selected icon & contractor for newly added items
  const [selectedIcon, setSelectedIcon] = useState<SiteIconType>("pipe");
  const [selectedColor, setSelectedColor] = useState<string>("#EF4444");
  const [activeContractorCode, setActiveContractorCode] = useState<string>(userContractorCode ?? "UME");

  // Editing dialog state
  const [editingItem, setEditingItem] = useState<SiteCalloutMarker | null>(null);
  const [editText, setEditText] = useState("");
  const [editColor, setEditColor] = useState("");
  const [editIcon, setEditIcon] = useState<SiteIconType>("pin");

  // Delete confirmation state
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<SiteCalloutMarker | null>(null);

  // Dragging state (can drag either "target" pin or "box")
  const dragRef = useRef<{
    id: string;
    kind: "target" | "box";
    startX: number;
    startY: number;
    moved: boolean;
  } | null>(null);

  const mapSrc = mapView === "plan" ? "/site-plan/site-plan-drawing.png" : "/site-plan/site-model-topdown.png";

  const pointFrom = (clientX: number, clientY: number) => {
    const rect = surfaceRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return {
      x: clamp01((clientX - rect.left) / rect.width),
      y: clamp01((clientY - rect.top) / rect.height),
    };
  };

  // Keyboard Delete support: press Delete or Backspace to prompt deletion
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (readOnly || !onDeleteCallout) return;
      if ((e.key === "Delete" || e.key === "Backspace") && activeMarkerId) {
        const target = e.target as HTMLElement | null;
        if (target && ["INPUT", "TEXTAREA"].includes(target.tagName)) return;
        const marker = markers.find((m) => m.id === activeMarkerId);
        if (marker) {
          setDeleteConfirmTarget(marker);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeMarkerId, markers, onDeleteCallout, readOnly]);

  // Drag handlers for target pin
  const handleTargetPointerDown = (id: string) => (e: ReactPointerEvent<HTMLDivElement>) => {
    if (readOnly) return;
    const target = e.target as HTMLElement | null;
    if (target && target.closest("button")) return;
    e.stopPropagation();
    dragRef.current = { id, kind: "target", startX: e.clientX, startY: e.clientY, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  // Drag handlers for callout box (ignore when clicking edit or delete buttons)
  const handleBoxPointerDown = (id: string) => (e: ReactPointerEvent<HTMLDivElement>) => {
    if (readOnly) return;
    const target = e.target as HTMLElement | null;
    if (target && target.closest("button")) return;
    e.stopPropagation();
    dragRef.current = { id, kind: "box", startX: e.clientX, startY: e.clientY, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (readOnly) return;
    const d = dragRef.current;
    if (!d) return;
    if (!d.moved && Math.hypot(e.clientX - d.startX, e.clientY - d.startY) < 4) return;
    d.moved = true;

    const pt = pointFrom(e.clientX, e.clientY);
    if (!pt) return;

    if (d.kind === "target") {
      onUpdateTarget?.(d.id, pt.x, pt.y);
    } else {
      onUpdateBox?.(d.id, pt.x, pt.y);
    }
  };

  const handlePointerUp = () => {
    dragRef.current = null;
  };

  // Click on map to add a new callout (Contractor only)
  const handleSurfaceClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (readOnly || !onAddCallout) return;
    const pt = pointFrom(e.clientX, e.clientY);
    if (!pt) return;

    const contractor = CONTRACTOR_PALETTES.find((c) => c.code === activeContractorCode) ?? CONTRACTOR_PALETTES[0]!;
    const defaultText =
      selectedIcon === "crane"
        ? "จุดวางเครน / งานยกโครงสร้าง"
        : selectedIcon === "pipe"
          ? "งานติดตั้ง Support ท่อ"
          : selectedIcon === "weld"
            ? "งานตัดเชื่อมท่อ"
            : selectedIcon === "box"
              ? "จุดประกอบชิ้นงาน"
              : "งานพื้นที่ปฏิบัติงาน";

    // Place box offset slightly from target
    const boxOffset = pt.y > 0.5 ? -0.07 : 0.07;

    onAddCallout({
      contractorCode: contractor.code,
      contractorName: contractor.name,
      icon: selectedIcon,
      text: defaultText,
      color: selectedColor,
      targetX: pt.x,
      targetY: pt.y,
      boxX: clamp01(pt.x + 0.05),
      boxY: clamp01(pt.y + boxOffset),
    });
  };

  const handleOpenEdit = (m: SiteCalloutMarker, e: React.MouseEvent) => {
    e.stopPropagation();
    if (readOnly) return;
    setEditingItem(m);
    setEditText(m.text);
    setEditColor(m.color);
    setEditIcon(m.icon);
  };

  const handleSaveEdit = () => {
    if (editingItem && editText.trim()) {
      onUpdateCallout?.(editingItem.id, {
        text: editText.trim(),
        color: editColor,
        icon: editIcon,
      });
      setEditingItem(null);
    }
  };

  return (
    <Box>
      {/* 1. Top Bar: Palette for Contractors OR Meeting Overview for EPS */}
      {!readOnly ? (
        <Paper
          elevation={0}
          variant="outlined"
          sx={{
            p: 2,
            mb: 1.5,
            borderRadius: 2.5,
            bgcolor: "background.paper",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
            border: "1.5px solid",
            borderColor: "primary.light",
            boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
          }}
        >
          {/* Left: Big Icon Selector */}
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Typography variant="body2" sx={{ fontWeight: 800, color: "text.primary", mr: 0.5 }}>
              เลือกไอคอน:
            </Typography>
            {SITE_ICONS.map((it) => {
              const isSelected = selectedIcon === it.type;
              return (
                <Button
                  key={it.type}
                  variant={isSelected ? "contained" : "outlined"}
                  onClick={() => setSelectedIcon(it.type)}
                  sx={{
                    minWidth: 0,
                    px: 2,
                    py: 1.25,
                    minHeight: 52,
                    fontSize: 14,
                    fontWeight: isSelected ? 800 : 600,
                    borderRadius: 2.5,
                    textTransform: "none",
                    gap: 1,
                    boxShadow: isSelected ? 3 : 0,
                    borderWidth: isSelected ? 2 : 1.5,
                  }}
                >
                  <span style={{ fontSize: 30, lineHeight: 1 }}>{it.emoji}</span>
                  <span>{it.label}</span>
                </Button>
              );
            })}
          </Stack>

          {/* Right: Contractor & Color Selection */}
          <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
            {/* Contractor selection */}
            <Stack direction="row" spacing={0.75} alignItems="center">
              <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700 }}>
                ผู้รับเหมา:
              </Typography>
              {CONTRACTOR_PALETTES.map((c) => {
                const isSelected = activeContractorCode === c.code;
                return (
                  <Chip
                    key={c.code}
                    label={c.name}
                    onClick={() => {
                      setActiveContractorCode(c.code);
                      setSelectedColor(c.defaultColor);
                    }}
                    sx={{
                      height: 32,
                      fontWeight: 800,
                      fontSize: 12,
                      cursor: "pointer",
                      border: isSelected ? `2.5px solid ${c.defaultColor}` : "1px solid transparent",
                      bgcolor: isSelected ? c.badgeBg : "action.hover",
                      color: isSelected ? c.defaultColor : "text.secondary",
                    }}
                  />
                );
              })}
            </Stack>

            {/* Color palette dots */}
            <Stack direction="row" spacing={1} alignItems="center">
              {PRESET_COLORS.map((col) => (
                <Box
                  key={col}
                  onClick={() => setSelectedColor(col)}
                  sx={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    bgcolor: col,
                    cursor: "pointer",
                    border: selectedColor === col ? "3px solid #000" : "1.5px solid rgba(0,0,0,0.2)",
                    transform: selectedColor === col ? "scale(1.2)" : "scale(1)",
                    transition: "transform 0.1s ease",
                  }}
                />
              ))}
            </Stack>
          </Stack>
        </Paper>
      ) : (
        <Paper
          elevation={0}
          variant="outlined"
          sx={{
            p: 1.5,
            mb: 1.5,
            borderRadius: 2,
            bgcolor: "rgba(15, 23, 42, 0.03)",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1.5,
          }}
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Chip
              size="small"
              label="โหมดการประชุม (EPS Meeting Review)"
              color="primary"
              sx={{ fontWeight: 800, fontSize: 11 }}
            />
            <Typography variant="body2" sx={{ color: "text.secondary", fontSize: 12.5 }}>
              แสดงข้อมูลตำแหน่งงานของทุกผู้รับเหมา สำหรับใช้ในการประชุมประสานงาน 17:00 น.
            </Typography>
          </Stack>

          {/* Contractor Legend */}
          <Stack direction="row" spacing={1} alignItems="center">
            {CONTRACTOR_PALETTES.map((c) => (
              <Stack key={c.code} direction="row" spacing={0.5} alignItems="center">
                <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: c.defaultColor }} />
                <Typography variant="caption" sx={{ fontWeight: 700, color: "text.primary", fontSize: 11 }}>
                  {c.name}
                </Typography>
              </Stack>
            ))}
          </Stack>
        </Paper>
      )}

      {/* Helper hint & Map View switch */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 0.5, mb: 1 }}>
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          {!readOnly
            ? "💡 คลิกบนผังเพื่อวางตำแหน่ง • ลากจุดหมุด หรือลากกล่องข้อความเพื่อจัดตำแหน่ง • เส้นโยงจะชี้เชื่อมโยงอัตโนมัติ"
            : "💡 คลิกที่จุดหรือกล่องข้อความบนผัง เพื่อเน้นไฮไลต์และดูรายละเอียด"}
        </Typography>

        <ButtonGroup size="small">
          <Button
            variant={mapView === "plan" ? "contained" : "outlined"}
            onClick={() => onChangeMapView("plan")}
            sx={{ fontSize: 11, fontWeight: 700 }}
          >
            CAD แบบแปลน
          </Button>
          <Button
            variant={mapView === "topview" ? "contained" : "outlined"}
            onClick={() => onChangeMapView("topview")}
            sx={{ fontSize: 11, fontWeight: 700 }}
          >
            ภาพผังสี
          </Button>
        </ButtonGroup>
      </Stack>

      {/* 2. Main Map Canvas Container */}
      <Box
        sx={{
          position: "relative",
          border: 1,
          borderColor: "divider",
          borderRadius: 2,
          overflow: "hidden",
          bgcolor: "#F8FAFC",
          boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
        }}
      >


        {/* Zoom Controls */}
        <Stack
          direction="column"
          spacing={0.5}
          sx={{
            position: "absolute",
            bottom: 14,
            right: 14,
            zIndex: 30,
            bgcolor: "rgba(255, 255, 255, 0.92)",
            backdropFilter: "blur(6px)",
            p: 0.5,
            borderRadius: 2,
            border: "1px solid rgba(0,0,0,0.12)",
            boxShadow: 2,
          }}
        >
          <IconButton
            size="small"
            disabled={zoomIdx >= ZOOMS.length - 1}
            onClick={() => setZoomIdx((i) => Math.min(ZOOMS.length - 1, i + 1))}
          >
            <AddIcon fontSize="small" />
          </IconButton>
          <Typography variant="caption" sx={{ textAlign: "center", fontSize: 10, fontWeight: 700 }}>
            {zoom * 100}%
          </Typography>
          <IconButton
            size="small"
            disabled={zoomIdx <= 0}
            onClick={() => setZoomIdx((i) => Math.max(0, i - 1))}
          >
            <RemoveIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={() => setZoomIdx(0)}>
            <RestartAltIcon fontSize="small" />
          </IconButton>
        </Stack>

        {/* Scrollable Viewport */}
        <Box
          sx={{
            overflow: "auto",
            width: "100%",
            height: { xs: 500, md: 680 },
            cursor: "crosshair",
          }}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          <Box
            ref={surfaceRef}
            onClick={handleSurfaceClick}
            sx={{
              position: "relative",
              width: `${zoom * 100}%`,
              minWidth: `${zoom * 100}%`,
              userSelect: "none",
              display: "inline-block",
            }}
          >
            {/* Background Site Map Drawing */}
            <Box
              component="img"
              src={mapSrc}
              alt="Site Coordination Map"
              draggable={false}
              sx={{ width: "100%", display: "block" }}
            />

            {/* SVG Connecting Leader Lines Layer */}
            <svg
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                pointerEvents: "none",
                zIndex: 5,
              }}
              viewBox="0 0 1000 1000"
              preserveAspectRatio="none"
            >
              {markers.map((m) => {
                const tx = m.targetX * 1000;
                const ty = m.targetY * 1000;
                const bx = m.boxX * 1000;
                const by = m.boxY * 1000;
                const isSelected = m.id === activeMarkerId;

                return (
                  <g key={`leader-${m.id}`}>
                    {/* Shadow line */}
                    <line
                      x1={tx}
                      y1={ty}
                      x2={bx}
                      y2={by}
                      stroke="rgba(0,0,0,0.25)"
                      strokeWidth={isSelected ? 5 : 4}
                    />
                    {/* Main connecting leader line */}
                    <line
                      x1={tx}
                      y1={ty}
                      x2={bx}
                      y2={by}
                      stroke={m.color}
                      strokeWidth={isSelected ? 3.5 : 2.5}
                      strokeDasharray={isSelected ? "5 3" : undefined}
                    />
                    {/* Target anchor point dot */}
                    <circle cx={tx} cy={ty} r="8" fill={m.color} stroke="#FFFFFF" strokeWidth="3" />
                  </g>
                );
              })}
            </svg>

            {/* Target Pins (Draggable Pin with BIG icon at Target Location) */}
            {markers.map((m) => {
              const iconObj = SITE_ICONS.find((i) => i.type === m.icon);
              const isSelected = m.id === activeMarkerId;

              return (
                <Box
                  key={`pin-${m.id}`}
                  onPointerDown={handleTargetPointerDown(m.id)}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectMarker(m.id);
                  }}
                  sx={{
                    position: "absolute",
                    left: `${m.targetX * 100}%`,
                    top: `${m.targetY * 100}%`,
                    transform: "translate(-50%, -50%)",
                    zIndex: isSelected ? 25 : 12,
                    cursor: readOnly ? "pointer" : "grab",
                    "&:active": { cursor: readOnly ? "pointer" : "grabbing" },
                  }}
                >
                  <Box
                    sx={{
                      width: { xs: 54, md: 66 },
                      height: { xs: 54, md: 66 },
                      borderRadius: "50%",
                      bgcolor: "#FFFFFF",
                      border: `4px solid ${m.color}`,
                      boxShadow: isSelected
                        ? `0 0 0 8px ${alpha(m.color, 0.45)}, 0 8px 24px rgba(0,0,0,0.4)`
                        : "0 4px 16px rgba(0,0,0,0.32)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: { xs: 28, md: 36 },
                      transition: "transform 0.15s ease",
                      "&:hover": { transform: "scale(1.18)" },
                      position: "relative",
                    }}
                  >
                    {iconObj?.emoji ?? "📍"}
                    {/* Contractor code badge under pin */}
                    <Box
                      sx={{
                        position: "absolute",
                        bottom: -11,
                        px: 0.9,
                        py: 0.15,
                        borderRadius: 99,
                        bgcolor: m.color,
                        color: "#FFFFFF",
                        fontSize: 10.5,
                        fontWeight: 800,
                        letterSpacing: 0.3,
                        whiteSpace: "nowrap",
                        boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
                        pointerEvents: "none",
                      }}
                    >
                      {m.contractorCode}
                    </Box>
                  </Box>
                </Box>
              );
            })}

            {/* Callout Text Boxes (Draggable Text Box with Leader Line) */}
            {markers.map((m) => {
              const iconObj = SITE_ICONS.find((i) => i.type === m.icon);
              const isSelected = m.id === activeMarkerId;

              return (
                <Box
                  key={`box-${m.id}`}
                  onPointerDown={handleBoxPointerDown(m.id)}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectMarker(m.id);
                  }}
                  sx={{
                    position: "absolute",
                    left: `${m.boxX * 100}%`,
                    top: `${m.boxY * 100}%`,
                    transform: "translate(-50%, -50%)",
                    zIndex: isSelected ? 30 : 15,
                    cursor: readOnly ? "pointer" : "grab",
                    userSelect: "none",
                    "&:active": { cursor: readOnly ? "pointer" : "grabbing" },
                  }}
                >
                  {/* Callout Box Styled exactly like contractor drawing attachments */}
                  <Paper
                    elevation={isSelected ? 6 : 3}
                    sx={{
                      p: 0,
                      borderRadius: 1.5,
                      border: `2px solid ${m.color}`,
                      bgcolor: "#FFFFFF",
                      overflow: "hidden",
                      minWidth: 180,
                      maxWidth: 280,
                      transition: "border 0.15s ease, box-shadow 0.15s ease",
                    }}
                  >
                    {/* Header: Contractor Code and Action Buttons */}
                    <Box
                      sx={{
                        px: 1.25,
                        py: 0.5,
                        bgcolor: m.color,
                        color: "#FFFFFF",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 1,
                      }}
                    >
                      <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
                        <span style={{ fontSize: 17, lineHeight: 1 }}>{iconObj?.emoji ?? "📍"}</span>
                        <Typography
                          variant="caption"
                          sx={{
                            fontWeight: 800,
                            fontSize: 11.5,
                            letterSpacing: 0.5,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {m.contractorName} ({m.contractorCode})
                        </Typography>
                      </Stack>
                      {!readOnly && onDeleteCallout && (
                        <Stack
                          direction="row"
                          spacing={0.5}
                          onPointerDown={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.stopPropagation()}
                          onTouchStart={(e) => e.stopPropagation()}
                        >
                          <Tooltip title="แก้ไขข้อความ">
                            <IconButton
                              size="small"
                              onPointerDown={(e) => e.stopPropagation()}
                              onMouseDown={(e) => e.stopPropagation()}
                              onTouchStart={(e) => e.stopPropagation()}
                              onClick={(e) => handleOpenEdit(m, e)}
                              sx={{ p: 0.4, color: "#FFFFFF", "&:hover": { bgcolor: "rgba(0,0,0,0.25)" } }}
                            >
                              <EditIcon sx={{ fontSize: 13 }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="ลบจุดนี้">
                            <IconButton
                              size="small"
                              onPointerDown={(e) => e.stopPropagation()}
                              onMouseDown={(e) => e.stopPropagation()}
                              onTouchStart={(e) => e.stopPropagation()}
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirmTarget(m);
                              }}
                              sx={{ p: 0.4, color: "#FFFFFF", "&:hover": { bgcolor: "rgba(0,0,0,0.25)" } }}
                            >
                              <CloseIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      )}
                    </Box>

                    {/* Text Body */}
                    <Box sx={{ px: 1.5, py: 1, bgcolor: "rgba(255,255,255,0.98)" }}>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 700,
                          fontSize: 13,
                          lineHeight: 1.4,
                          color: "#0F172A",
                        }}
                      >
                        {m.text}
                      </Typography>
                    </Box>
                  </Paper>
                </Box>
              );
            })}
          </Box>
        </Box>
      </Box>

      {/* Mini Edit Dialog for quick text change */}
      <Dialog open={Boolean(editingItem)} onClose={() => setEditingItem(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ pb: 1, fontWeight: 700, fontSize: 16 }}>
          แก้ไขข้อความ / สัญลักษณ์
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="ข้อความแสดงบนผัง"
              fullWidth
              size="small"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              placeholder="เช่น ติดตั้ง Support ท่อ, จุดวางเครน 50T"
              autoFocus
            />

            {/* Select Icon */}
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", display: "block", mb: 0.75 }}>
                เลือกสัญลักษณ์:
              </Typography>
              <Stack direction="row" spacing={0.75} flexWrap="wrap" gap={0.5}>
                {SITE_ICONS.map((it) => (
                  <Chip
                    key={it.type}
                    size="small"
                    label={`${it.emoji} ${it.label}`}
                    onClick={() => setEditIcon(it.type)}
                    color={editIcon === it.type ? "primary" : "default"}
                    variant={editIcon === it.type ? "filled" : "outlined"}
                    sx={{ cursor: "pointer", fontWeight: 600 }}
                  />
                ))}
              </Stack>
            </Box>

            {/* Select Color */}
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", display: "block", mb: 0.75 }}>
                เลือกสีกรอบ:
              </Typography>
              <Stack direction="row" spacing={1}>
                {PRESET_COLORS.map((col) => (
                  <Box
                    key={col}
                    onClick={() => setEditColor(col)}
                    sx={{
                      width: 26,
                      height: 26,
                      borderRadius: "50%",
                      bgcolor: col,
                      cursor: "pointer",
                      border: editColor === col ? "3px solid #000" : "1.5px solid rgba(0,0,0,0.2)",
                    }}
                  />
                ))}
              </Stack>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            color="error"
            size="small"
            startIcon={<DeleteOutlineIcon />}
            onClick={() => {
              if (editingItem) {
                const toDelete = editingItem;
                setEditingItem(null);
                setDeleteConfirmTarget(toDelete);
              }
            }}
          >
            ลบ
          </Button>
          <Box sx={{ flexGrow: 1 }} />
          <Button onClick={() => setEditingItem(null)} color="inherit" size="small">
            ยกเลิก
          </Button>
          <Button onClick={handleSaveEdit} variant="contained" size="small" disabled={!editText.trim()}>
            บันทึก
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={Boolean(deleteConfirmTarget)}
        onClose={() => setDeleteConfirmTarget(null)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3, p: 1 },
        }}
      >
        <DialogTitle sx={{ pb: 1, fontWeight: 800, fontSize: 17, display: "flex", alignItems: "center", gap: 1 }}>
          <span style={{ fontSize: 22 }}>🗑️</span> ยืนยันการลบจุดงาน?
        </DialogTitle>
        <DialogContent sx={{ py: 1.5 }}>
          <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
            คุณต้องการลบจุดงานนี้ออกจากผังใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้
          </Typography>
          {deleteConfirmTarget && (
            <Paper
              variant="outlined"
              sx={{
                p: 1.5,
                borderRadius: 2,
                borderLeft: `5px solid ${deleteConfirmTarget.color}`,
                bgcolor: "rgba(15, 23, 42, 0.03)",
              }}
            >
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                <span style={{ fontSize: 20 }}>
                  {SITE_ICONS.find((i) => i.type === deleteConfirmTarget.icon)?.emoji ?? "📍"}
                </span>
                <Chip
                  size="small"
                  label={`${deleteConfirmTarget.contractorName} (${deleteConfirmTarget.contractorCode})`}
                  sx={{
                    bgcolor: deleteConfirmTarget.color,
                    color: "#FFFFFF",
                    fontWeight: 800,
                    fontSize: 11,
                    height: 22,
                  }}
                />
              </Stack>
              <Typography variant="body2" sx={{ fontWeight: 700, color: "text.primary", mt: 0.75 }}>
                {deleteConfirmTarget.text}
              </Typography>
            </Paper>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, pt: 1, gap: 1 }}>
          <Button
            onClick={() => setDeleteConfirmTarget(null)}
            color="inherit"
            variant="outlined"
            sx={{ borderRadius: 2, fontWeight: 700 }}
          >
            ยกเลิก
          </Button>
          <Button
            onClick={() => {
              if (deleteConfirmTarget && onDeleteCallout) {
                onDeleteCallout(deleteConfirmTarget.id);
                setDeleteConfirmTarget(null);
              }
            }}
            color="error"
            variant="contained"
            startIcon={<DeleteOutlineIcon />}
            sx={{
              borderRadius: 2,
              fontWeight: 800,
              bgcolor: "#EF4444",
              "&:hover": { bgcolor: "#DC2626" },
            }}
            autoFocus
          >
            ยืนยันการลบ
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

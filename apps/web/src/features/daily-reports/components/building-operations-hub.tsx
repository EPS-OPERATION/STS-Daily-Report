import AddRoadOutlinedIcon from "@mui/icons-material/AddRoadOutlined";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import ConstructionOutlinedIcon from "@mui/icons-material/ConstructionOutlined";
import FilterAltOutlinedIcon from "@mui/icons-material/FilterAltOutlined";
import GridViewOutlinedIcon from "@mui/icons-material/GridViewOutlined";
import MapOutlinedIcon from "@mui/icons-material/MapOutlined";
import TableChartOutlinedIcon from "@mui/icons-material/TableChartOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { alpha, useTheme } from "@mui/material/styles";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import type {
  InspectionRequest,
  WeeklyBooking,
  WeeklyBuildingRow,
  WeeklyCell,
  WeeklySummary,
} from "../types/daily-report.types.js";
import { ContractorBadge } from "./contractor-badge.js";
import { PERMIT_ICONS, permitLabel } from "./permit-meta.js";

// Spatial positions normalized (0..100%) on the top-down master plot plan
// (STSBPP-EB-C-023-011-0 G A0.02 & 3D Model Top-Down render).
export interface BuildingSpatialMeta {
  code: string;
  name: string;
  nameTh: string;
  zone: "west" | "center" | "east";
  // Percentage coordinates on the schematic site canvas
  x: number; // Left %
  y: number; // Top %
  w: number; // Width %
  h: number; // Height %
}

export const BUILDING_PLOT_COORDINATES: Record<string, BuildingSpatialMeta> = {
  // --- East Zone (Biomass) ---
  BMS: { code: "BMS", name: "Biomass Storage", nameTh: "อาคารเก็บชีวมวล", zone: "east", x: 67, y: 26, w: 30, h: 48 },
  BMT: { code: "BMT", name: "Biomass Transport", nameTh: "สายพานลำเลียงชีวมวล", zone: "east", x: 50, y: 9, w: 26, h: 14 },

  // --- Center Zone (Boiler & Flue Gas) ---
  BLR: { code: "BLR", name: "Boiler", nameTh: "หม้อไอน้ำ", zone: "center", x: 41, y: 13, w: 18, h: 28 },
  BAB: { code: "BAB", name: "Bottom Ash Bunker", nameTh: "บ่อพักขี้เถ้าหนัก", zone: "center", x: 57, y: 24, w: 10, h: 10 },
  FAS: { code: "FAS", name: "Fly Ash Silo", nameTh: "ไซโลขี้เถ้าลอย", zone: "center", x: 55, y: 41, w: 10, h: 11 },
  DOT: { code: "DOT", name: "Diesel Oil Tank", nameTh: "ถังน้ำมันดีเซล", zone: "center", x: 52, y: 56, w: 11, h: 10 },
  FGT: { code: "FGT", name: "FGT", nameTh: "บำบัดก๊าซเสีย", zone: "center", x: 42, y: 53, w: 12, h: 15 },
  STK: { code: "STK", name: "Stack", nameTh: "ปล่องควัน", zone: "center", x: 35, y: 68, w: 12, h: 26 },

  // --- West Zone (Power Gen & Water Utilities) ---
  RWP: { code: "RWP", name: "Raw Water Pond & Pump", nameTh: "บ่อน้ำดิบและเครื่องสูบ", zone: "west", x: 19, y: 5, w: 23, h: 20 },
  WTK: { code: "WTK", name: "Water Tank & Pump House", nameTh: "ถังเก็บน้ำและโรงสูบ", zone: "west", x: 8, y: 26, w: 16, h: 16 },
  WTP: { code: "WTP", name: "Water Treatment Plant", nameTh: "โรงบำบัดน้ำ", zone: "west", x: 5, y: 44, w: 16, h: 13 },
  CT: { code: "CT", name: "Cooling Tower", nameTh: "หอหล่อเย็นเสริม", zone: "west", x: 9, y: 59, w: 14, h: 12 },
  CMP: { code: "CMP", name: "Compressor Room", nameTh: "ห้องเครื่องอัดอากาศ", zone: "west", x: 6, y: 72, w: 15, h: 13 },
  TR: { code: "TR", name: "Transformer", nameTh: "หม้อแปลงไฟฟ้า", zone: "west", x: 26, y: 34, w: 11, h: 9 },
  TG: { code: "TG", name: "TG Building", nameTh: "อาคารกังหันไอน้ำ", zone: "west", x: 23, y: 43, w: 17, h: 21 },
  ACC: { code: "ACC", name: "ACC", nameTh: "หอควบแน่น ACC", zone: "west", x: 21, y: 66, w: 16, h: 22 },
};

const DAY_THAI = ["จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์", "อาทิตย์"];

export function BuildingOperationsHub({
  summary,
  inspections = [],
  todayIso,
  onOpenMatrix,
}: {
  summary: WeeklySummary;
  inspections?: InspectionRequest[];
  todayIso: string;
  onOpenMatrix?: () => void;
}) {
  const theme = useTheme();

  // Find index of today or default to 0 (Monday)
  const defaultDayIndex = useMemo(() => {
    const idx = summary.days.indexOf(todayIso);
    return idx >= 0 ? idx : 0;
  }, [summary.days, todayIso]);

  const [selectedDayIdx, setSelectedDayIdx] = useState<number>(defaultDayIndex);
  const [selectedBuildingCode, setSelectedBuildingCode] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"plot" | "grid">("plot");
  const [filterType, setFilterType] = useState<"all" | "active" | "permits" | "machinery" | "qaqc">("all");

  const selectedDate = summary.days[selectedDayIdx] ?? summary.days[0] ?? todayIso;
  const isToday = selectedDate === todayIso;
  const tomorrowIso = dayjs(todayIso).add(1, "day").format("YYYY-MM-DD");
  const isTomorrow = selectedDate === tomorrowIso;

  // Aggregate active data for the selected date
  const dayData = useMemo(() => {
    const buildingMap = new Map<
      string,
      {
        row: WeeklyBuildingRow;
        cell: WeeklyCell;
        machinery: WeeklyBooking[];
        inspections: InspectionRequest[];
      }
    >();

    summary.buildings.forEach((b) => {
      const cell = b.cells[selectedDayIdx] ?? {
        date: selectedDate,
        headcount: 0,
        contractors: [],
        permits: [],
        workItems: [],
        level: "none",
      };

      const bMachinery = summary.machinery.filter(
        (m) => m.targetDate === selectedDate && m.buildingCode === b.code,
      );

      const bInspections = inspections.filter(
        (ins) => ins.inspectionDate === selectedDate && ins.buildingCode === b.code,
      );

      buildingMap.set(b.code, {
        row: b,
        cell,
        machinery: bMachinery,
        inspections: bInspections,
      });
    });

    const dayRoads = summary.roads.filter((r) => r.buildingId);

    return { buildingMap, dayRoads };
  }, [summary, selectedDayIdx, selectedDate, inspections]);

  // Filtered building list
  const filteredBuildingCodes = useMemo(() => {
    const all = Object.keys(BUILDING_PLOT_COORDINATES);
    if (filterType === "all") return all;

    return all.filter((code) => {
      const b = dayData.buildingMap.get(code);
      if (!b) return false;
      if (filterType === "active") return b.cell.headcount > 0;
      if (filterType === "permits") return b.cell.permits.length > 0;
      if (filterType === "machinery") return b.machinery.length > 0;
      if (filterType === "qaqc") return b.inspections.length > 0;
      return true;
    });
  }, [dayData, filterType]);

  const selectedBuildingData = selectedBuildingCode ? dayData.buildingMap.get(selectedBuildingCode) : null;
  const selectedMeta = selectedBuildingCode ? BUILDING_PLOT_COORDINATES[selectedBuildingCode] : null;

  return (
    <Box sx={{ position: "relative" }}>
      {/* Top Controls: Day Selector & View Mode Switch */}
      <Card sx={{ mb: 2.5, border: 1, borderColor: "divider", overflow: "visible" }}>
        <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={2}
            justifyContent="space-between"
            alignItems={{ xs: "stretch", md: "center" }}
          >
            {/* Days Tabs (Mon - Sun) */}
            <Tabs
              value={selectedDayIdx}
              onChange={(_, val) => setSelectedDayIdx(val)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                minHeight: 44,
                "& .MuiTab-root": {
                  minHeight: 44,
                  py: 0.5,
                  px: 1.75,
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  textTransform: "none",
                },
              }}
            >
              {summary.days.map((d, i) => {
                const dayDate = dayjs(d);
                const isDayToday = d === todayIso;
                const isDayTomorrow = d === tomorrowIso;

                return (
                  <Tab
                    key={d}
                    label={
                      <Stack direction="row" spacing={0.75} alignItems="center">
                        <Box>{DAY_THAI[i]} {dayDate.format("D/M")}</Box>
                        {isDayToday ? (
                          <Chip label="วันนี้" size="small" color="primary" sx={{ height: 18, fontSize: "0.65rem", px: 0.2 }} />
                        ) : isDayTomorrow ? (
                          <Chip label="พรุ่งนี้" size="small" variant="outlined" color="warning" sx={{ height: 18, fontSize: "0.65rem", px: 0.2 }} />
                        ) : null}
                      </Stack>
                    }
                  />
                );
              })}
            </Tabs>

            {/* View Mode Toggle */}
            <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end">
              <Button
                variant={viewMode === "plot" ? "contained" : "outlined"}
                size="small"
                startIcon={<MapOutlinedIcon />}
                onClick={() => setViewMode("plot")}
                sx={{ textTransform: "none", borderRadius: 2 }}
              >
                ผังไซต์งาน
              </Button>
              <Button
                variant={viewMode === "grid" ? "contained" : "outlined"}
                size="small"
                startIcon={<GridViewOutlinedIcon />}
                onClick={() => setViewMode("grid")}
                sx={{ textTransform: "none", borderRadius: 2 }}
              >
                การ์ด 16 อาคาร
              </Button>
              {onOpenMatrix ? (
                <Button
                  variant="text"
                  size="small"
                  startIcon={<TableChartOutlinedIcon />}
                  onClick={onOpenMatrix}
                  sx={{ textTransform: "none" }}
                >
                  ตารางสรุป 7 วัน
                </Button>
              ) : null}
            </Stack>
          </Stack>

          <Divider sx={{ my: 1.5 }} />

          {/* Filter Chips */}
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
            <Typography variant="caption" color="text.secondary" sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <FilterAltOutlinedIcon fontSize="small" /> กรองข้อมูล:
            </Typography>
            {[
              { id: "all", label: "ทั้งหมด 16 อาคาร" },
              { id: "active", label: "มีกิจกรรม/คนทำงาน" },
              { id: "permits", label: "🛡️ มีใบอนุญาตงานเสี่ยง" },
              { id: "machinery", label: "🚜 มีเครื่องจักร" },
              { id: "qaqc", label: "🔍 มีนัดตรวจ QAQC" },
            ].map((f) => (
              <Chip
                key={f.id}
                label={f.label}
                size="small"
                variant={filterType === f.id ? "filled" : "outlined"}
                color={filterType === f.id ? "primary" : "default"}
                onClick={() => setFilterType(f.id as any)}
                sx={{ cursor: "pointer", fontWeight: filterType === f.id ? 700 : 500 }}
              />
            ))}
          </Stack>
        </CardContent>
      </Card>

      {/* ROAD CLOSURE / TRAFFIC ALERT BAR (If active on selected date) */}
      {dayData.dayRoads.length > 0 ? (
        <Alert
          severity="warning"
          icon={<AddRoadOutlinedIcon />}
          sx={{ mb: 2, border: 1, borderColor: "warning.main", bgcolor: alpha(theme.palette.warning.light, 0.3) }}
        >
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            คำขอใช้เส้นทาง / ปิดถนนรอบโครงการ ({dayData.dayRoads.length} คำขอในวันนี้):
          </Typography>
          <Stack spacing={0.5} sx={{ mt: 0.5 }}>
            {dayData.dayRoads.map((r, i) => (
              <Typography key={i} variant="caption">
                • <b>{r.roadLocation}</b> ({r.startTime} – {r.endTime}): {r.purpose}
              </Typography>
            ))}
          </Stack>
        </Alert>
      ) : null}

      {/* VIEW MODE 1: VISUAL SCHEMATIC PLOT MAP (STSBPP G A0.02 + 3D Topdown) */}
      {viewMode === "plot" ? (
        <Card
          sx={{
            position: "relative",
            width: "100%",
            borderRadius: 3,
            border: 1,
            borderColor: "divider",
            bgcolor: "#1A2530", // Sleek dark slate blueprint ground
            color: "#FFFFFF",
            overflow: "hidden",
            boxShadow: "0 12px 32px rgba(0,0,0,0.18)",
          }}
        >
          {/* Topbar of the Map */}
          <Box
            sx={{
              p: 1.5,
              px: 2,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              bgcolor: "rgba(11, 77, 139, 0.45)",
              borderBottom: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            <Stack direction="row" spacing={1} alignItems="center">
              <MapOutlinedIcon sx={{ color: "#60A5FA" }} />
              <Typography variant="body2" sx={{ fontWeight: 700, color: "#FFFFFF" }}>
                ผังบริเวณและคำขอปฏิบัติงานรายอาคาร (Site Layout G A0.02)
              </Typography>
              <Chip
                label={isToday ? "วันนี้ (Today)" : isTomorrow ? "พรุ่งนี้ (Tomorrow)" : selectedDate}
                size="small"
                sx={{ bgcolor: "rgba(255,255,255,0.15)", color: "#FFFFFF", height: 20, fontSize: "0.7rem" }}
              />
            </Stack>
            <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.65)" }}>
              คลิกที่อาคารเพื่อดูคำขอและกิจกรรมอย่างละเอียด
            </Typography>
          </Box>

          {/* Map Plot Area (Aspect Ratio container ~ 16:9 responsive) */}
          <Box
            sx={{
              position: "relative",
              width: "100%",
              height: { xs: 580, sm: 660, md: 740 },
              backgroundImage: "radial-gradient(circle at 50% 50%, rgba(30, 48, 66, 0.6) 0%, rgba(15, 23, 42, 0.95) 100%)",
              overflow: "hidden",
            }}
          >
            {/* Optional Top-down image background layer with soft opacity */}
            <Box
              component="img"
              src="/site-plan/site-model-topdown.png"
              alt="Site Plot"
              sx={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                objectFit: "contain",
                opacity: 0.22,
                pointerEvents: "none",
                filter: "contrast(1.15) brightness(0.85)",
              }}
            />

            {/* Perimeter Road Indicator (O: Road and Drainage) */}
            <Box
              sx={{
                position: "absolute",
                top: "4%",
                left: "3%",
                right: "3%",
                bottom: "4%",
                border: "2px dashed rgba(255,255,255,0.15)",
                borderRadius: 4,
                pointerEvents: "none",
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  position: "absolute",
                  bottom: 6,
                  left: 14,
                  color: "rgba(255,255,255,0.35)",
                  letterSpacing: "0.1em",
                  fontSize: "0.65rem",
                }}
              >
                ROAD & PERIMETER ACCESS (O)
              </Typography>
            </Box>

            {/* 16 Interactive Building Nodes */}
            {Object.entries(BUILDING_PLOT_COORDINATES).map(([code, meta]) => {
              const data = dayData.buildingMap.get(code);
              const cell = data?.cell;
              const hasWork = cell && cell.headcount > 0;
              const isVisible = filteredBuildingCodes.includes(code);
              const hasPermits = (cell?.permits.length ?? 0) > 0;
              const hasQAQC = (data?.inspections.length ?? 0) > 0;
              const isSelected = selectedBuildingCode === code;

              return (
                <Box
                  key={code}
                  onClick={() => setSelectedBuildingCode(code)}
                  sx={{
                    position: "absolute",
                    left: `${meta.x}%`,
                    top: `${meta.y}%`,
                    width: `${meta.w}%`,
                    height: `${meta.h}%`,
                    p: 0.75,
                    opacity: isVisible ? 1 : 0.2,
                    cursor: "pointer",
                    transition: "all 0.22s cubic-bezier(0.4, 0, 0.2, 1)",
                    zIndex: isSelected ? 5 : 2,
                    "&:hover": {
                      transform: "scale(1.03)",
                      zIndex: 10,
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: "100%",
                      height: "100%",
                      borderRadius: 2,
                      p: 1,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      backdropFilter: "blur(6px)",
                      bgcolor: hasWork
                        ? isSelected
                          ? "rgba(14, 165, 233, 0.7)"
                          : "rgba(15, 76, 129, 0.65)"
                        : "rgba(30, 41, 59, 0.55)",
                      border: "1.5px solid",
                      borderColor: isSelected
                        ? "#38BDF8"
                        : hasWork
                          ? "#60A5FA"
                          : "rgba(255,255,255,0.18)",
                      boxShadow: isSelected
                        ? "0 0 16px rgba(56, 189, 248, 0.5)"
                        : "0 4px 12px rgba(0,0,0,0.3)",
                    }}
                  >
                    {/* Top Row: Building Code & Headcount */}
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: 800,
                          fontSize: "0.75rem",
                          letterSpacing: "0.04em",
                          color: "#FFFFFF",
                        }}
                      >
                        {meta.code}
                      </Typography>
                      {hasWork ? (
                        <Box
                          sx={{
                            px: 0.6,
                            py: 0.1,
                            borderRadius: 1,
                            bgcolor: "rgba(0,0,0,0.35)",
                            fontSize: "0.7rem",
                            fontWeight: 700,
                            color: "#34D399",
                          }}
                        >
                          👷 {cell.headcount}
                        </Box>
                      ) : null}
                    </Stack>

                    {/* Middle: Building Thai Name */}
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 600,
                        fontSize: "0.68rem",
                        color: "rgba(255,255,255,0.9)",
                        lineHeight: 1.15,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {meta.nameTh}
                    </Typography>

                    {/* Bottom Indicator Badges */}
                    <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap">
                      {/* Machinery Badge */}
                      {(data?.machinery.length ?? 0) > 0 ? (
                        <Tooltip title={`มีเครื่องจักรทำงาน ${data?.machinery.length} เครื่อง`}>
                          <Chip
                            size="small"
                            icon={<ConstructionOutlinedIcon sx={{ color: "#FBBF24 !important", fontSize: 13 }} />}
                            label={String(data?.machinery.length)}
                            sx={{ height: 18, fontSize: "0.6rem", bgcolor: "rgba(245, 158, 11, 0.25)", color: "#FDE68A", px: 0.1 }}
                          />
                        </Tooltip>
                      ) : null}

                      {/* Work Permit Badge */}
                      {hasPermits ? (
                        <Tooltip title={`งานเสี่ยง ${cell?.permits.length} ใบอนุญาต`}>
                          <Box sx={{ fontSize: "0.65rem", lineHeight: 1 }}>🛡️</Box>
                        </Tooltip>
                      ) : null}

                      {/* QAQC Badge */}
                      {hasQAQC ? (
                        <Tooltip title={`มีนัดตรวจ QAQC ${data?.inspections.length} รายการ`}>
                          <Box sx={{ fontSize: "0.65rem", lineHeight: 1 }}>🔍</Box>
                        </Tooltip>
                      ) : null}

                      {/* Contractor Badges (Compact) */}
                      {cell?.contractors.slice(0, 2).map((c) => (
                        <Box
                          key={c.code}
                          sx={{
                            fontSize: "0.58rem",
                            px: 0.4,
                            py: 0.1,
                            borderRadius: 0.5,
                            bgcolor: "rgba(255,255,255,0.18)",
                            fontWeight: 700,
                          }}
                        >
                          {c.code}
                        </Box>
                      ))}
                    </Stack>
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Card>
      ) : (
        /* VIEW MODE 2: BUILDING CARDS GRID */
        <Grid container spacing={2}>
          {Object.entries(BUILDING_PLOT_COORDINATES).map(([code, meta]) => {
            const data = dayData.buildingMap.get(code);
            const cell = data?.cell;
            const hasWork = cell && cell.headcount > 0;
            const isVisible = filteredBuildingCodes.includes(code);

            if (!isVisible) return null;

            return (
              <Grid key={code} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                <Card
                  variant="outlined"
                  sx={{
                    height: "100%",
                    borderRadius: 2.5,
                    border: 1.5,
                    borderColor: hasWork ? "primary.main" : "divider",
                    transition: "transform 0.15s ease",
                    "&:hover": { transform: "translateY(-2px)" },
                  }}
                >
                  <CardActionArea onClick={() => setSelectedBuildingCode(code)} sx={{ height: "100%", p: 1.75 }}>
                    <Stack spacing={1}>
                      {/* Card Header */}
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                        <Box>
                          <Typography variant="caption" sx={{ fontWeight: 800, color: "primary.main" }}>
                            {code}
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                            {meta.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {meta.nameTh}
                          </Typography>
                        </Box>
                        <Chip
                          label={hasWork ? `👷 ${cell.headcount} คน` : "ไม่มีงาน"}
                          size="small"
                          color={hasWork ? "primary" : "default"}
                          variant={hasWork ? "filled" : "outlined"}
                          sx={{ fontWeight: 700 }}
                        />
                      </Stack>

                      <Divider sx={{ my: 0.5 }} />

                      {/* Contractors */}
                      {cell && cell.contractors.length > 0 ? (
                        <Stack direction="row" spacing={0.5} flexWrap="wrap">
                          {cell.contractors.map((c) => (
                            <ContractorBadge key={c.code} code={c.code} headcount={c.headcount} />
                          ))}
                        </Stack>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          ไม่มีผู้รับเหมาในวันนี้
                        </Typography>
                      )}

                      {/* Quick Summary Badges */}
                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                        {(data?.machinery.length ?? 0) > 0 ? (
                          <Chip
                            icon={<ConstructionOutlinedIcon fontSize="small" />}
                            label={`${data?.machinery.length} เครื่อง`}
                            size="small"
                            variant="outlined"
                          />
                        ) : null}
                        {(cell?.permits.length ?? 0) > 0 ? (
                          <Chip
                            label={`🛡️ ${cell?.permits.length} ใบงานเสี่ยง`}
                            size="small"
                            variant="outlined"
                            color="warning"
                          />
                        ) : null}
                        {(data?.inspections.length ?? 0) > 0 ? (
                          <Chip
                            label={`🔍 ${data?.inspections.length} ตรวจ QAQC`}
                            size="small"
                            variant="outlined"
                            color="info"
                          />
                        ) : null}
                      </Stack>
                    </Stack>
                  </CardActionArea>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* INTERACTIVE DETAIL DRAWER (When clicking on any building) */}
      <Drawer
        anchor="right"
        open={Boolean(selectedBuildingCode)}
        onClose={() => setSelectedBuildingCode(null)}
        PaperProps={{
          sx: {
            width: { xs: "100%", sm: 460 },
            p: 3,
            boxSizing: "border-box",
          },
        }}
      >
        {selectedBuildingData && selectedMeta ? (
          <Stack spacing={2.5}>
            {/* Drawer Header */}
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
              <Box>
                <Chip label={`อาคาร ${selectedMeta.code}`} color="primary" size="small" sx={{ fontWeight: 800, mb: 0.5 }} />
                <Typography variant="h5" sx={{ fontWeight: 800 }}>
                  {selectedMeta.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedMeta.nameTh}
                </Typography>
              </Box>
              <IconButton onClick={() => setSelectedBuildingCode(null)} edge="end">
                <CloseOutlinedIcon />
              </IconButton>
            </Stack>

            <Divider />

            {/* Date and Manpower Overview Card */}
            <Card variant="outlined" sx={{ bgcolor: "background.default", p: 1.5, borderRadius: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    วันที่ตรวจสอบ
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 700 }}>
                    {dayjs(selectedDate).format("dddd D MMMM YYYY")}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: "right" }}>
                  <Typography variant="caption" color="text.secondary">
                    กำลังพลรวมในอาคารนี้
                  </Typography>
                  <Typography variant="h5" color="primary.main" sx={{ fontWeight: 800 }}>
                    {selectedBuildingData.cell.headcount} คน
                  </Typography>
                </Box>
              </Stack>
            </Card>

            {/* 1. Active Contractors & Work Activities */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                ผู้รับเหมาและกิจกรรมที่กำลังปฏิบัติงาน:
              </Typography>
              {selectedBuildingData.cell.contractors.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  ไม่มีกิจกรรมในวันดังกล่าว
                </Typography>
              ) : (
                <Stack spacing={1}>
                  {selectedBuildingData.cell.contractors.map((c) => (
                    <Card key={c.code} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Stack direction="row" spacing={1} alignItems="center">
                          <ContractorBadge code={c.code} />
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {c.name}
                          </Typography>
                        </Stack>
                        <Chip label={`${c.headcount} คน`} size="small" variant="outlined" sx={{ fontWeight: 700 }} />
                      </Stack>
                    </Card>
                  ))}
                </Stack>
              )}
            </Box>


            <Divider />

            {/* 2. Machinery Bookings & Conflict Warning */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, display: "flex", alignItems: "center", gap: 0.5 }}>
                <ConstructionOutlinedIcon fontSize="small" /> เครื่องจักรที่จองในอาคารนี้:
              </Typography>

              {selectedBuildingData.machinery.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  ไม่มีการจองเครื่องจักร
                </Typography>
              ) : (
                <Stack spacing={1}>
                  {selectedBuildingData.machinery.map((m) => (
                    <Card
                      key={m.id}
                      variant="outlined"
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        borderColor: "divider",
                        bgcolor: "background.paper",
                      }}
                    >
                      <Stack spacing={0.5}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            🚜 {m.machineType} {m.unitTag ? `(${m.unitTag})` : ""}
                          </Typography>
                          <Chip label={m.contractorCode} size="small" />
                        </Stack>
                        <Typography variant="caption" color="text.secondary">
                          เวลา: <b>{m.startTime} – {m.endTime}</b>
                        </Typography>
                      </Stack>
                    </Card>
                  ))}
                </Stack>
              )}
            </Box>

            <Divider />

            {/* 3. High-Risk Work Permits */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                🛡️ ใบอนุญาตงานเสี่ยง (Work Permits):
              </Typography>

              {selectedBuildingData.cell.permits.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  ไม่มีงานเสี่ยงอันตรายสูง
                </Typography>
              ) : (
                <Stack spacing={1}>
                  {selectedBuildingData.cell.permits.map((p, i) => {
                    const Icon = PERMIT_ICONS[p.type];
                    return (
                      <Card key={i} variant="outlined" sx={{ p: 1.25, borderRadius: 2 }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          {Icon ? <Icon color="warning" fontSize="small" /> : null}
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {permitLabel(p.type)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            ({p.workers} คน)
                          </Typography>
                        </Stack>
                      </Card>
                    );
                  })}
                </Stack>
              )}
            </Box>

            <Divider />

            {/* 4. QAQC Inspection Requests */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                🔍 คำขอนัดตรวจ QAQC:
              </Typography>

              {selectedBuildingData.inspections.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  ไม่มีนัดตรวจงานในวันดังกล่าว
                </Typography>
              ) : (
                <Stack spacing={1}>
                  {selectedBuildingData.inspections.map((ins) => (
                    <Card key={ins.id} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                      <Stack spacing={0.5}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            {ins.workItem}
                          </Typography>
                          <Chip label={ins.status} size="small" color={ins.status === "confirmed" ? "success" : "default"} />
                        </Stack>
                        <Typography variant="caption" color="text.secondary">
                          ประเภท: <b>{ins.inspectionType}</b> | เวลา: <b>{ins.inspectionTime}</b>
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          ผู้ยื่น: {ins.contractorName} ({ins.contractorCode})
                        </Typography>
                      </Stack>
                    </Card>
                  ))}
                </Stack>
              )}
            </Box>
          </Stack>
        ) : null}
      </Drawer>
    </Box>
  );
}

import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import BusinessOutlinedIcon from "@mui/icons-material/BusinessOutlined";
import EngineeringOutlinedIcon from "@mui/icons-material/EngineeringOutlined";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Grid from "@mui/material/Grid";
import Link from "@mui/material/Link";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemAvatar from "@mui/material/ListItemAvatar";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs, { type Dayjs } from "dayjs";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link as RouterLink, useSearchParams } from "react-router-dom";
import Skeleton from "@mui/material/Skeleton";
import { KpiCard } from "@/components/ui/kpi-card.js";
import { PageHeader } from "@/components/ui/page-header.js";
import { SiteConditionsStrip } from "@/components/dashboard/site-conditions-strip.js";
import { KPI_BY_RANGE } from "@/mock/site-data.js";
import { CoordinationMapBoard, useCoordinationState } from "@/features/site-coordination/index.js";
import {
  ContractorFilterPopover,
  addDaysIso,
  contractorColorMap,
  todayIso,
  useDailyRequests,
  useInspectionRequests,
} from "@/features/daily-reports/index.js";
import { useCurrentProject, useProjectContractors } from "@/features/projects/index.js";

type Range = "today" | "week" | "month";

const HIGHLIGHT_TONE = {
  error: { bg: "#FDECEC", fg: "#DC2626", icon: ErrorOutlineIcon },
  info: { bg: "#E8F1FE", fg: "#2787FF", icon: InfoOutlinedIcon },
  warning: { bg: "#FEF3E2", fg: "#B45309", icon: WarningAmberOutlinedIcon },
  success: { bg: "#E7F6EC", fg: "#16A34A", icon: InfoOutlinedIcon },
} as const;

const PERMIT_LABEL: Record<string, string> = {
  hot_work: "งานประกายไฟ (Hot work)",
  confined_space: "ที่อับอากาศ (Confined space)",
  height: "งานที่สูง (Height)",
  lifting: "งานยก (Lifting)",
  excavation: "งานขุด (Excavation)",
  radiation: "งานรังสี (Radiation)",
  electrical: "ระบบไฟฟ้า (Electrical)",
  chemical: "สารเคมี (Chemical)",
  other: "อื่นๆ (Other)",
};

export function DashboardPage() {
  const theme = useTheme();
  const [from, setFrom] = useState<Dayjs | null>(dayjs());
  const [to, setTo] = useState<Dayjs | null>(dayjs());

  // Mock KPIs only exist per bucket — the picked range selects the closest one.
  const valid = Boolean(from && to && !to!.isBefore(from!, "day"));
  const days = valid ? to!.diff(from!, "day") : 0;
  const bucket: Range = days === 0 ? "today" : days < 8 ? "week" : "month";
  const kpi = KPI_BY_RANGE[bucket];

  const [params, setParams] = useSearchParams();
  const { projectId } = useCurrentProject();
  const projectContractors = useProjectContractors(projectId).data?.data ?? [];
  const today = todayIso();
  const tomorrow = addDaysIso(today, 1);
  const rfi = useInspectionRequests(projectId, { from: today, to: tomorrow, by: "inspection" });
  const rfiRows = (rfi.data?.data ?? []).filter((r) => r.status !== "draft");
  const dailyReqs = useDailyRequests(projectId, today, today);
  const reqData = dailyReqs.data?.data;

  const contractorNames = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of projectContractors) if (c.code) m.set(c.code, c.name);
    if (reqData) {
      for (const r of [...reqData.roads, ...reqData.permits, ...reqData.machinery, ...reqData.forecasts]) {
        if ("contractorCode" in r && r.contractorCode) {
          m.set(r.contractorCode, ("contractorName" in r && r.contractorName ? r.contractorName : undefined) || m.get(r.contractorCode) || "");
        }
      }
    }
    for (const r of rfiRows) {
      if (r.contractorCode) m.set(r.contractorCode, r.contractorName || m.get(r.contractorCode) || "");
    }
    return m;
  }, [projectContractors, reqData, rfiRows]);

  const allCodes = useMemo(() => {
    const set = new Set<string>();
    if (reqData) {
      for (const r of [...reqData.roads, ...reqData.permits, ...reqData.machinery, ...reqData.forecasts]) {
        if ("contractorCode" in r && r.contractorCode) set.add(r.contractorCode);
      }
    }
    for (const r of rfiRows) {
      if (r.contractorCode) set.add(r.contractorCode);
    }
    const codes = set.size > 0 ? [...set] : projectContractors.map((c) => c.code);
    return codes.sort((a, b) => a.localeCompare(b));
  }, [reqData, rfiRows, projectContractors]);

  const selectedCodes = useMemo<Set<string>>(() => {
    const raw = params.get("contractors");
    if (raw === null) return new Set(allCodes);
    return new Set(raw.split(",").map((c) => c.trim()).filter((c) => allCodes.includes(c)));
  }, [params, allCodes]);

  const setContractors = (next: Set<string>) => {
    const p = new URLSearchParams(params);
    if (next.size === allCodes.length) p.delete("contractors");
    else p.set("contractors", [...next].sort().join(","));
    setParams(p, { replace: true });
  };

  const colors = useMemo(() => contractorColorMap(allCodes), [allCodes]);

  const filterItems = useMemo(() => {
    return allCodes.map((code) => {
      let n = 0;
      if (reqData) {
        n += [...reqData.roads, ...reqData.permits, ...reqData.machinery, ...reqData.forecasts].filter((r) => r.contractorCode === code).length;
      }
      n += rfiRows.filter((r) => r.contractorCode === code).length;
      return {
        code,
        name: contractorNames.get(code),
        color: colors.get(code) ?? "#999",
        countLabel: `${n} รายการ`,
      };
    });
  }, [allCodes, reqData, rfiRows, contractorNames, colors]);

  const rfiToday = rfiRows.filter((r) => r.inspectionDate === today && selectedCodes.has(r.contractorCode)).length;
  const rfiTomorrow = rfiRows.filter((r) => r.inspectionDate === tomorrow && selectedCodes.has(r.contractorCode)).length;

  // Build dynamic highlights from requests for today
  const dynamicHighlights = useMemo(() => {
    if (!reqData) return [];
    const items: {
      id: string;
      title: string;
      lines: string[];
      tone: "error" | "warning" | "info" | "success";
    }[] = [];

    // 1. Road clashes (High priority error)
    reqData.roads
      .filter((r) => r.conflict && selectedCodes.has(r.contractorCode))
      .forEach((r) => {
        items.push({
          id: `road-conflict-${r.id}`,
          title: `แจ้งเตือนถนนทับซ้อน: ${r.roadLocation}`,
          lines: [`ผู้รับเหมา ${r.contractorCode}`, `${r.startTime} – ${r.endTime} น.`, r.purpose || "ขอใช้ทาง"],
          tone: "error",
        });
      });

    // 2. High-risk permits
    reqData.permits
      .filter((p) => selectedCodes.has(p.contractorCode))
      .forEach((p) => {
        items.push({
          id: `permit-${p.id}`,
          title: `Work Permit: ${PERMIT_LABEL[p.permitType] ?? p.permitType} · ${p.buildingName || p.buildingCode}`,
          lines: [`ผู้รับเหมา ${p.contractorCode}`, `จำนวน ${p.workers} คน`],
          tone: "warning",
        });
      });

    // 3. Machinery bookings
    reqData.machinery
      .filter((m) => selectedCodes.has(m.contractorCode))
      .forEach((m) => {
        items.push({
          id: `machinery-${m.id}`,
          title: `จองเครื่องจักร: ${m.machineType}${m.unitTag ? ` (${m.unitTag})` : ""} · ${m.buildingCode}`,
          lines: [
            `ผู้รับเหมา ${m.contractorCode}`,
            m.startTime && m.endTime ? `${m.startTime} – ${m.endTime} น.` : "ตลอดวัน",
            m.purpose || "ใช้งานตามแผน",
          ],
          tone: "info",
        });
      });

    // 4. QAQC Today inspections
    rfiRows
      .filter((r) => r.inspectionDate === today && selectedCodes.has(r.contractorCode))
      .forEach((r) => {
        items.push({
          id: `rfi-${r.id}`,
          title: `QAQC ตรวจงาน: ${r.workItem || r.inspectionType} · ${r.buildingCode}`,
          lines: [`ผู้รับเหมา ${r.contractorCode}`, `เวลา ${r.inspectionTime || "ตามนัดหมาย"}`, r.drawingRef ? `แบบ ${r.drawingRef}` : ""].filter(Boolean),
          tone: "success",
        });
      });

    // 5. Normal road usage
    reqData.roads
      .filter((r) => !r.conflict && selectedCodes.has(r.contractorCode))
      .forEach((r) => {
        items.push({
          id: `road-${r.id}`,
          title: `ขอใช้ถนน: ${r.roadLocation}`,
          lines: [`ผู้รับเหมา ${r.contractorCode}`, `${r.startTime} – ${r.endTime} น.`, r.purpose || ""].filter(Boolean),
          tone: "info",
        });
      });

    // 6. Forecast Activities
    reqData.forecasts
      .filter((f) => selectedCodes.has(f.contractorCode))
      .forEach((f) => {
        items.push({
          id: `forecast-${f.id}`,
          title: `แผนงานวันนี้: ${f.description}`,
          lines: [`ผู้รับเหมา ${f.contractorCode}`, f.buildingCode],
          tone: "info",
        });
      });

    return items;
  }, [reqData, rfiRows, today, selectedCodes]);
  const rangeLabel = !valid
    ? "End date is before start date — showing today's figures"
    : days === 0
      ? from!.format("MMM D, YYYY")
      : `${from!.format("MMM D")} – ${to!.format("MMM D, YYYY")} (${bucket === "week" ? "weekly" : "monthly"} figures)`;

  return (
    <Box>
      <PageHeader
        title="Project Dashboard"
        subtitle="Overview of construction progress and daily operations"
        actions={
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <DatePicker
              label="From"
              value={from}
              onChange={setFrom}
              slotProps={{ textField: { size: "small" } }}
              sx={{ width: 150 }}
            />
            <DatePicker
              label="To"
              value={to}
              onChange={setTo}
              slotProps={{ textField: { size: "small" } }}
              sx={{ width: 150 }}
            />
            {allCodes.length > 0 && (
              <ContractorFilterPopover
                items={filterItems}
                selectedCodes={selectedCodes}
                onChange={setContractors}
              />
            )}
          </Stack>
        }
      />
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, mt: -1.5 }}>
        {rangeLabel}
      </Typography>

      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <KpiCard
            label="Manpower"
            value={String(kpi.manpower.value)}
            sub={kpi.manpower.delta}
            subTone="success"
            trend="up"
            icon={<EngineeringOutlinedIcon />}
            iconBg={theme.palette.info.light}
            iconFg={theme.palette.info.dark}
            to="/manpower"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <KpiCard
            label="Contractors"
            value={String(kpi.contractors.value)}
            sub={kpi.contractors.sub}
            icon={<BusinessOutlinedIcon />}
            iconBg={theme.palette.success.light}
            iconFg={theme.palette.success.dark}
            to="/contractors"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <KpiCard
            label="Work Permits"
            value={String(kpi.permits.value)}
            sub={kpi.permits.sub}
            subTone="error"
            icon={<AssignmentOutlinedIcon />}
            iconBg={theme.palette.error.light}
            iconFg={theme.palette.error.dark}
            to="/safety?tab=permits"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <KpiCard
            label="QAQC · Today RFI"
            value={rfi.isLoading ? "–" : String(rfiToday)}
            unit="รายการ"
            sub={rfi.isLoading ? "" : `พรุ่งนี้ ${rfiTomorrow} รายการ`}
            icon={<FactCheckOutlinedIcon />}
            iconBg={theme.palette.warning.light}
            iconFg={theme.palette.warning.dark}
            to="/qaqc"
          />
        </Grid>
      </Grid>

      {/* Compact site map + weather (full card moved out to keep the PM view short) */}
      <Box sx={{ mb: 3 }}>
        <SiteConditionsStrip />
      </Box>

      <Grid container spacing={2.5}>

        <Grid size={{ xs: 12, lg: 6 }}>
          <Card sx={{ height: "100%" }}>
            <CardContent sx={{ p: 2.5 }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
                <Typography variant="h5">Site Activity Overview</Typography>
                <Link component={RouterLink} to="/site-coordination" underline="hover" fontSize={13}>
                  Open Map
                </Link>
              </Stack>
              <DashboardSiteMap />
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, lg: 6 }}>
          <Card sx={{ height: "100%" }}>
            <CardContent sx={{ p: 2.5 }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                <Box>
                  <Typography variant="h5">Today&apos;s Highlight</Typography>
                  <Typography variant="caption" color="text.secondary">
                    คำขอประจำวัน (ดึงจากฟอร์มรายงานบ่ายของเมื่อวาน)
                  </Typography>
                </Box>
                <Link component={RouterLink} to="/today-requests" underline="hover" fontSize={13}>
                  ดูทั้งหมด ({dynamicHighlights.length})
                </Link>
              </Stack>

              {dailyReqs.isLoading ? (
                <Stack spacing={1.5} sx={{ py: 2 }}>
                  <Skeleton variant="rounded" height={48} />
                  <Skeleton variant="rounded" height={48} />
                  <Skeleton variant="rounded" height={48} />
                </Stack>
              ) : dynamicHighlights.length === 0 ? (
                <Box sx={{ py: 4, textAlign: "center" }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    ยังไม่มีคำขอเครื่องจักร/ใบอนุญาตสำหรับวันนี้
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
                    (ระบบจะดึงคำขอจากฟอร์มรอบบ่ายที่ผู้รับเหมาส่งเมื่อวานโดยอัตโนมัติ)
                  </Typography>
                  <Button
                    component={RouterLink}
                    to="/today-requests"
                    size="small"
                    variant="outlined"
                  >
                    เปิดดู Daily Request
                  </Button>
                </Box>
              ) : (
                <List disablePadding>
                  {dynamicHighlights.slice(0, 5).map((h) => {
                    const tone = HIGHLIGHT_TONE[h.tone];
                    const ToneIcon = tone.icon;
                    return (
                      <ListItem key={h.id} disableGutters sx={{ py: 1.25 }}>
                        <ListItemAvatar sx={{ minWidth: 44 }}>
                          <Box
                            sx={{
                              width: 34,
                              height: 34,
                              borderRadius: "50%",
                              bgcolor: tone.bg,
                              color: tone.fg,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <ToneIcon fontSize="small" aria-hidden="true" />
                          </Box>
                        </ListItemAvatar>
                        <ListItemText
                          primary={h.title}
                          secondary={h.lines.join(" · ")}
                          primaryTypographyProps={{ fontSize: 14, fontWeight: 600 }}
                          secondaryTypographyProps={{ fontSize: 13 }}
                        />
                      </ListItem>
                    );
                  })}
                </List>
              )}

              <Button
                component={RouterLink}
                to="/today-requests"
                variant="outlined"
                endIcon={<ArrowForwardIcon />}
                fullWidth
                sx={{ mt: 1 }}
              >
                เปิดดูคำขอประจำวันทั้งหมด (Daily Request)
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

// Same pins as the Map page (EPS edits them there); view-only here. The board is laid
// out at the Map page's width and scaled down as a whole, so callouts keep their
// positions relative to the drawing instead of overflowing a narrow card.
const MAP_DESIGN_WIDTH = 1200;

function DashboardSiteMap() {
  const { markers, colors, activeMarkerId, setActiveMarkerId, mapView, setMapView } = useCoordinationState();
  const today = dayjs().format("YYYY-MM-DD");
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState({ scale: 0.5, height: 400 });

  useEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;
    const measure = () => {
      const scale = Math.min(1, outer.clientWidth / MAP_DESIGN_WIDTH);
      setFit({ scale, height: inner.offsetHeight * scale });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(outer);
    ro.observe(inner);
    return () => ro.disconnect();
  }, []);

  return (
    <Box ref={outerRef} sx={{ position: "relative", overflow: "hidden", height: fit.height }}>
      <Box
        ref={innerRef}
        sx={{ width: MAP_DESIGN_WIDTH, transform: `scale(${fit.scale})`, transformOrigin: "top left" }}
      >
        <CoordinationMapBoard
          date={today}
          markers={markers}
          colors={colors}
          activeMarkerId={activeMarkerId}
          onSelectMarker={setActiveMarkerId}
          mapView={mapView}
          onChangeMapView={setMapView}
          readOnly
        />
      </Box>
    </Box>
  );
}

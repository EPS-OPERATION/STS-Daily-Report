import CheckOutlinedIcon from "@mui/icons-material/CheckOutlined";
import ContentCopyOutlinedIcon from "@mui/icons-material/ContentCopyOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import { useCurrentProject, useProjectContractors } from "@/features/projects/index.js";
import { ContractorFilterPopover } from "@/features/daily-reports/index.js";
import {
  CoordinationMapBoard,
  FALLBACK_MAP_COLOR,
  MapDayPicker,
  MapItemList,
  useCoordinationState,
} from "@/features/site-coordination/index.js";

export function SiteCoordinationPage() {
  const [date, setDate] = useState(() => dayjs().format("YYYY-MM-DD"));
  const map = useCoordinationState(date);
  const { projectId } = useCurrentProject();
  const projectContractors = useProjectContractors(projectId).data?.data ?? [];
  // EPS views the map in meetings by default and switches to edit to fix pins.
  const [editing, setEditing] = useState(false);

  const confirmDelete = (fn: (id: string) => void) => (id: string) => {
    if (window.confirm("ลบรายการนี้ออกจากผัง?")) fn(id);
  };

  const allCodes = useMemo(() => {
    const set = new Set<string>();
    for (const c of map.dayContractors) set.add(c.code);
    for (const c of projectContractors) set.add(c.code);
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [map.dayContractors, projectContractors]);

  const contractorNames = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of projectContractors) m.set(c.code, c.name);
    for (const c of map.dayContractors) m.set(c.code, c.name);
    return m;
  }, [projectContractors, map.dayContractors]);

  const selectedCodes = useMemo<Set<string>>(() => {
    if (map.selectedContractors !== null) return map.selectedContractors;
    return new Set(allCodes);
  }, [map.selectedContractors, allCodes]);

  const handleContractorsChange = (next: Set<string>) => {
    map.setSelectedContractors(next.size === allCodes.length ? null : next);
  };

  const filterItems = useMemo(() => {
    return allCodes.map((code) => {
      const n = map.markers.filter((m) => m.contractorCode === code).length;
      return {
        code,
        name: contractorNames.get(code),
        color: map.colors.get(code) ?? FALLBACK_MAP_COLOR,
        countLabel: `${n} จุด`,
      };
    });
  }, [allCodes, map.markers, contractorNames, map.colors]);

  return (
    <Box sx={{ maxWidth: 1600, mx: "auto" }}>
      <Stack direction={{ xs: "column", lg: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", lg: "center" }} spacing={2} sx={{ mb: 2 }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            Map (ผังประสานงานหน้างาน)
          </Typography>
          <Chip label="EPS Meeting & Review" color="primary" size="small" sx={{ fontWeight: 700, borderRadius: 1 }} />
        </Stack>

        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
          <MapDayPicker date={date} onChange={setDate} />
          {allCodes.length > 0 && (
            <ContractorFilterPopover
              items={filterItems}
              selectedCodes={selectedCodes}
              onChange={handleContractorsChange}
            />
          )}
          <Button
            size="small"
            variant={editing ? "contained" : "outlined"}
            onClick={() => setEditing((v) => !v)}
            startIcon={editing ? <CheckOutlinedIcon fontSize="small" /> : <EditOutlinedIcon fontSize="small" />}
            sx={{ whiteSpace: "nowrap" }}
          >
            {editing ? "เสร็จสิ้น" : "แก้ไขผัง"}
          </Button>
          {editing ? (
            <>
              <Tooltip title={map.previousDate ? `คัดลอกงานบนผังจากวันที่ ${dayjs(map.previousDate).format("D/M/YYYY")}` : "ยังไม่มีแผนของวันก่อนหน้า"}>
                <span>
                  <Button
                    size="small"
                    variant="outlined"
                    disabled={!map.previousDate}
                    onClick={map.copyFromPreviousDay}
                    startIcon={<ContentCopyOutlinedIcon fontSize="small" />}
                    sx={{ whiteSpace: "nowrap" }}
                  >
                    คัดลอกจากวันก่อน
                  </Button>
                </span>
              </Tooltip>
              <Tooltip title="แทนที่ผังของวันนี้ด้วยข้อมูลตัวอย่าง">
                <Button size="small" variant="outlined" color="inherit" onClick={map.resetToDefault} startIcon={<RestartAltIcon fontSize="small" />} sx={{ whiteSpace: "nowrap" }}>
                  รีเซ็ตตัวอย่าง
                </Button>
              </Tooltip>
            </>
          ) : null}
        </Stack>
      </Stack>

      {/* Map canvas: view-only for meetings, editable after "แก้ไขผัง" */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
          <CoordinationMapBoard
            date={date}
            markers={map.filteredMarkers}
            colors={map.colors}
            contractors={projectContractors}
            activeMarkerId={map.activeMarkerId}
            onSelectMarker={map.setActiveMarkerId}
            mapView={map.mapView}
            onChangeMapView={map.setMapView}
            onUpdateTarget={map.updateTargetPosition}
            onUpdateBox={map.updateBoxPosition}
            onUpdateCallout={map.updateCallout}
            onDeleteCallout={map.deleteCallout}
            onAddCallout={map.addCallout}
            readOnly={!editing}
          />
        </CardContent>
      </Card>

      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
          รายการบนผัง วันที่ {dayjs(date).format("D/M/YYYY")} ({map.filteredMarkers.length})
        </Typography>
        <MapItemList
          markers={map.filteredMarkers}
          colors={map.colors}
          activeId={map.activeMarkerId}
          onSelect={map.setActiveMarkerId}
          canDelete={() => editing}
          onDelete={confirmDelete(map.deleteCallout)}
        />
      </Box>
    </Box>
  );
}

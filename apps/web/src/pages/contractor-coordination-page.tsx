import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import dayjs from "dayjs";
import { useState } from "react";
import { FieldBottomNav } from "@/components/field/field-bottom-nav.js";
import { useMe } from "@/features/auth/index.js";
import { CoordinationMapBoard, MapDayPicker, MapItemList, useCoordinationState } from "@/features/site-coordination/index.js";

export function ContractorCoordinationPage() {
  const me = useMe();
  const userContractors = me.data?.data.contractors ?? [];
  const userContractorCode = userContractors[0]?.code ?? "";
  const ownCodes = new Set(userContractors.map((c) => c.code));

  const [date, setDate] = useState(() => dayjs().format("YYYY-MM-DD"));
  const map = useCoordinationState(date);
  const [filterMode, setFilterMode] = useState<"all" | "mine">("all");

  const handleFilterModeChange = (mode: "all" | "mine") => {
    setFilterMode(mode);
    map.setSelectedContractor(mode === "mine" ? userContractorCode : "all");
  };

  const confirmDelete = (fn: (id: string) => void) => (id: string) => {
    if (window.confirm("ลบรายการนี้ออกจากผัง?")) fn(id);
  };

  return (
    <Box sx={{ maxWidth: { xs: 540, md: 1200 }, mx: "auto", pb: { xs: 10, md: 4 } }}>
      <Card sx={{ bgcolor: "navy.dark", border: "none", mb: 2 }}>
        <CardContent sx={{ p: 2.5, color: "#FFFFFF" }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
            <Chip size="small" label={`ผู้รับเหมา: ${userContractorCode || "-"}`} sx={{ bgcolor: "primary.main", color: "#FFFFFF", fontWeight: 800, fontSize: 11 }} />
            <Chip size="small" label="แชร์ข้อมูลร่วมกันทุกเจ้า" sx={{ bgcolor: "rgba(255,255,255,0.15)", color: "#FFFFFF", fontSize: 11 }} />
          </Stack>
          <Typography variant="h5" sx={{ fontWeight: 800, color: "#FFFFFF" }}>
            Map (ผังประสานงานหน้างาน)
          </Typography>
          <Typography variant="caption" sx={{ color: "#9DB4CC" }}>
            เลือกวัน แล้ววางไอคอนเครื่องจักร/จุดงาน และวาดพื้นที่ที่จะใช้ — สีตามผู้รับเหมา
          </Typography>
        </CardContent>
      </Card>

      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" useFlexGap spacing={1} sx={{ mb: 1.5 }}>
        <MapDayPicker date={date} onChange={setDate} />
        <Stack direction="row" spacing={1} alignItems="center">
          <ToggleButtonGroup exclusive size="small" value={filterMode} onChange={(_, v) => v && handleFilterModeChange(v)} sx={{ bgcolor: "background.paper" }}>
            <ToggleButton value="all" sx={{ px: 1.5, fontWeight: 700, fontSize: 12 }}>
              <GroupsOutlinedIcon fontSize="small" sx={{ mr: 0.5 }} />
              ทุกเจ้า
            </ToggleButton>
            <ToggleButton value="mine" sx={{ px: 1.5, fontWeight: 700, fontSize: 12 }} disabled={!userContractorCode}>
              <PersonOutlineIcon fontSize="small" sx={{ mr: 0.5 }} />
              เฉพาะของฉัน
            </ToggleButton>
          </ToggleButtonGroup>
          <Button size="small" variant="text" color="inherit" onClick={map.resetToDefault} startIcon={<RestartAltIcon fontSize="small" />} sx={{ fontSize: 11, color: "text.secondary" }}>
            รีเซ็ต
          </Button>
        </Stack>
      </Stack>

      <Card sx={{ mb: 2.5 }}>
        <CardContent sx={{ p: { xs: 1, sm: 2 } }}>
          <CoordinationMapBoard
            date={date}
            markers={map.filteredMarkers}
            colors={map.colors}
            contractors={userContractors.map((c) => ({ code: c.code, name: c.name }))}
            userContractorCode={userContractorCode || undefined}
            activeMarkerId={map.activeMarkerId}
            onSelectMarker={map.setActiveMarkerId}
            onUpdateTarget={map.updateTargetPosition}
            onUpdateBox={map.updateBoxPosition}
            onUpdateCallout={map.updateCallout}
            onDeleteCallout={map.deleteCallout}
            onAddCallout={map.addCallout}
            mapView={map.mapView}
            onChangeMapView={map.setMapView}
          />
        </CardContent>
      </Card>

      <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
        รายการบนผัง ({map.filteredMarkers.length})
      </Typography>
      <Box sx={{ mb: 4 }}>
        <MapItemList
          markers={map.filteredMarkers}
          colors={map.colors}
          activeId={map.activeMarkerId}
          onSelect={map.setActiveMarkerId}
          canDelete={(code) => ownCodes.has(code)}
          onDelete={confirmDelete(map.deleteCallout)}
        />
      </Box>

      <FieldBottomNav />
    </Box>
  );
}

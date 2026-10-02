import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { FieldBottomNav } from "@/components/field/field-bottom-nav.js";
import { useMe } from "@/features/auth/index.js";
import {
  CoordinationMapBoard,
  SITE_ICONS,
  type SiteCalloutMarker,
  useCoordinationState,
} from "@/features/site-coordination/index.js";

export function ContractorCoordinationPage() {
  const me = useMe();
  const userContractors = me.data?.data.contractors ?? [];
  const primaryContractor = userContractors[0];
  const userContractorCode = primaryContractor?.code ?? "UME";

  const {
    filteredMarkers,
    activeMarkerId,
    setActiveMarkerId,
    selectedContractor,
    setSelectedContractor,
    mapView,
    setMapView,
    addCallout,
    updateTargetPosition,
    updateBoxPosition,
    updateCallout,
    deleteCallout,
    resetToDefault,
  } = useCoordinationState();

  const [filterMode, setFilterMode] = useState<"all" | "mine">("all");
  const [cardDeleteTarget, setCardDeleteTarget] = useState<SiteCalloutMarker | null>(null);

  const handleFilterModeChange = (newMode: "all" | "mine") => {
    setFilterMode(newMode);
    if (newMode === "mine") {
      setSelectedContractor(userContractorCode);
    } else {
      setSelectedContractor("all");
    }
  };

  return (
    <Box sx={{ maxWidth: { xs: 540, md: 1200 }, mx: "auto", pb: { xs: 10, md: 4 } }}>
      {/* Mobile-first Header Banner */}
      <Card sx={{ bgcolor: "navy.dark", border: "none", mb: 2 }}>
        <CardContent sx={{ p: 2.5, color: "#FFFFFF" }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
            <Box>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                <Chip
                  size="small"
                  label={`ผู้รับเหมา: ${userContractorCode}`}
                  sx={{ bgcolor: "primary.main", color: "#FFFFFF", fontWeight: 800, fontSize: 11 }}
                />
                <Chip
                  size="small"
                  label="แชร์ข้อมูลร่วมกันทุกเจ้า"
                  sx={{ bgcolor: "rgba(255,255,255,0.15)", color: "#FFFFFF", fontSize: 11 }}
                />
              </Stack>
              <Typography variant="h5" sx={{ fontWeight: 800, color: "#FFFFFF" }}>
                Map (ผังประสานงานหน้างาน)
              </Typography>
              <Typography variant="caption" sx={{ color: "#9DB4CC" }}>
                คลิกบนผังเพื่อวางจุดงานและกล่องข้อความ ทุกเจ้าจะเห็นร่วมกันทันที
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* Visibility Toggle: All Contractors vs My Work */}
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 1.5 }}
      >
        <ToggleButtonGroup
          exclusive
          size="small"
          value={filterMode}
          onChange={(_, val) => val && handleFilterModeChange(val)}
          sx={{ bgcolor: "background.paper" }}
        >
          <ToggleButton value="all" sx={{ px: 1.5, fontWeight: 700, fontSize: 12 }}>
            <GroupsOutlinedIcon fontSize="small" sx={{ mr: 0.5 }} />
            เห็นทุกเจ้า ({selectedContractor === "all" ? filteredMarkers.length : "ทั้งหมด"})
          </ToggleButton>
          <ToggleButton value="mine" sx={{ px: 1.5, fontWeight: 700, fontSize: 12 }}>
            <PersonOutlineIcon fontSize="small" sx={{ mr: 0.5 }} />
            เฉพาะของฉัน ({userContractorCode})
          </ToggleButton>
        </ToggleButtonGroup>

        <Button
          size="small"
          variant="text"
          color="inherit"
          onClick={resetToDefault}
          startIcon={<RestartAltIcon fontSize="small" />}
          sx={{ fontSize: 11, color: "text.secondary" }}
        >
          รีเซ็ต
        </Button>
      </Stack>

      {/* Top-View Map Board */}
      <Card sx={{ mb: 2.5 }}>
        <CardContent sx={{ p: { xs: 1, sm: 2 } }}>
          <CoordinationMapBoard
            markers={filteredMarkers}
            activeMarkerId={activeMarkerId}
            onSelectMarker={setActiveMarkerId}
            onUpdateTarget={updateTargetPosition}
            onUpdateBox={updateBoxPosition}
            onUpdateCallout={updateCallout}
            onDeleteCallout={deleteCallout}
            onAddCallout={addCallout}
            mapView={mapView}
            onChangeMapView={setMapView}
            userContractorCode={userContractorCode}
          />
        </CardContent>
      </Card>

      {/* Marker Cards Stream for Field Workers */}
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
        รายการจุดงานในพื้นที่ ({filteredMarkers.length})
      </Typography>

      <Stack spacing={1.5} sx={{ mb: 4 }}>
        {filteredMarkers.map((m) => {
          const iconObj = SITE_ICONS.find((i) => i.type === m.icon);
          const isSelected = m.id === activeMarkerId;
          const isMine = m.contractorCode === userContractorCode;

          return (
            <Card
              key={m.id}
              onClick={() => setActiveMarkerId(m.id)}
              sx={{
                cursor: "pointer",
                border: "2px solid",
                borderColor: isSelected ? m.color : isMine ? `${m.color}88` : "divider",
                borderRadius: 2,
                transition: "all 0.15s ease",
                "&:hover": { borderColor: m.color },
              }}
            >
              <CardContent sx={{ p: 2 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                  <Stack direction="row" spacing={1.25} alignItems="center">
                    <Box
                      sx={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        bgcolor: `${m.color}20`,
                        border: `2px solid ${m.color}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 20,
                      }}
                    >
                      {iconObj?.emoji ?? "📍"}
                    </Box>
                    <Chip
                      size="small"
                      label={`${m.contractorName} (${m.contractorCode})`}
                      sx={{
                        bgcolor: m.color,
                        color: "#FFFFFF",
                        fontWeight: 800,
                        fontSize: 11.5,
                      }}
                    />
                  </Stack>
                  <Button
                    size="small"
                    color="error"
                    variant="outlined"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCardDeleteTarget(m);
                    }}
                    sx={{ minWidth: 0, px: 1, py: 0.25, fontSize: 11.5, fontWeight: 700 }}
                  >
                    ลบ
                  </Button>
                </Stack>

                <Typography variant="body2" sx={{ fontWeight: 700, color: "#0F172A", mt: 0.5 }}>
                  {m.text}
                </Typography>
              </CardContent>
            </Card>
          );
        })}
      </Stack>

      {/* Delete Confirmation Dialog for Card Stream */}
      <Dialog
        open={Boolean(cardDeleteTarget)}
        onClose={() => setCardDeleteTarget(null)}
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
          {cardDeleteTarget && (
            <Paper
              variant="outlined"
              sx={{
                p: 1.5,
                borderRadius: 2,
                borderLeft: `5px solid ${cardDeleteTarget.color}`,
                bgcolor: "rgba(15, 23, 42, 0.03)",
              }}
            >
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                <span style={{ fontSize: 20 }}>
                  {SITE_ICONS.find((i) => i.type === cardDeleteTarget.icon)?.emoji ?? "📍"}
                </span>
                <Chip
                  size="small"
                  label={`${cardDeleteTarget.contractorName} (${cardDeleteTarget.contractorCode})`}
                  sx={{
                    bgcolor: cardDeleteTarget.color,
                    color: "#FFFFFF",
                    fontWeight: 800,
                    fontSize: 11,
                    height: 22,
                  }}
                />
              </Stack>
              <Typography variant="body2" sx={{ fontWeight: 700, color: "text.primary", mt: 0.75 }}>
                {cardDeleteTarget.text}
              </Typography>
            </Paper>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, pt: 1, gap: 1 }}>
          <Button
            onClick={() => setCardDeleteTarget(null)}
            color="inherit"
            variant="outlined"
            sx={{ borderRadius: 2, fontWeight: 700 }}
          >
            ยกเลิก
          </Button>
          <Button
            onClick={() => {
              if (cardDeleteTarget) {
                deleteCallout(cardDeleteTarget.id);
                setCardDeleteTarget(null);
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

      {/* Mobile Field Bottom Nav */}
      <FieldBottomNav />
    </Box>
  );
}

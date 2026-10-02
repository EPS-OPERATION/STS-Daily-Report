import RestartAltIcon from "@mui/icons-material/RestartAlt";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import FormControl from "@mui/material/FormControl";
import Grid from "@mui/material/Grid";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import {
  CONTRACTOR_PALETTES,
  CoordinationMapBoard,
  SITE_ICONS,
  useCoordinationState,
} from "@/features/site-coordination/index.js";

export function SiteCoordinationPage() {
  const {
    filteredMarkers,
    activeMarkerId,
    setActiveMarkerId,
    selectedContractor,
    setSelectedContractor,
    mapView,
    setMapView,
    resetToDefault,
  } = useCoordinationState();

  return (
    <Box sx={{ maxWidth: 1600, mx: "auto" }}>
      {/* Top Header */}
      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", md: "center" }}
        spacing={2}
        sx={{ mb: 2 }}
      >
        <Box>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Typography variant="h4" sx={{ fontWeight: 800 }}>
              Map (ผังประสานงานหน้างาน)
            </Typography>
            <Chip
              label="EPS Meeting & Review"
              color="primary"
              size="small"
              sx={{ fontWeight: 700, borderRadius: 1 }}
            />
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            ผังรวมสำหรับใช้เปิดบนหน้าจอประชุม 17:00 น. เพื่อประสานงานตำแหน่งงานและเครื่องจักร (ผู้รับเหมาเป็นผู้ระบุข้อมูลจากหน้างาน)
          </Typography>
        </Box>

        {/* Filter by Contractor & Reset */}
        <Stack direction="row" spacing={1.5} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel id="filter-contractor-label">แสดงผู้รับเหมา</InputLabel>
            <Select
              labelId="filter-contractor-label"
              label="แสดงผู้รับเหมา"
              value={selectedContractor}
              onChange={(e) => setSelectedContractor(e.target.value)}
            >
              <MenuItem value="all">
                <em>ทุกเจ้า ({filteredMarkers.length} จุด)</em>
              </MenuItem>
              {CONTRACTOR_PALETTES.map((c) => (
                <MenuItem key={c.code} value={c.code}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: c.defaultColor }} />
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {c.name} ({c.code})
                    </Typography>
                  </Stack>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Tooltip title="รีเซ็ตข้อมูลตัวอย่างกลับเป็นค่าเริ่มต้น">
            <Button
              size="small"
              variant="outlined"
              color="inherit"
              onClick={resetToDefault}
              startIcon={<RestartAltIcon fontSize="small" />}
              sx={{ whiteSpace: "nowrap" }}
            >
              รีเซ็ตตัวอย่าง
            </Button>
          </Tooltip>
        </Stack>
      </Stack>

      {/* Main Interactive Map Canvas (Read-Only for EPS Meeting Display) */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
          <CoordinationMapBoard
            markers={filteredMarkers}
            activeMarkerId={activeMarkerId}
            onSelectMarker={setActiveMarkerId}
            mapView={mapView}
            onChangeMapView={setMapView}
            readOnly={true}
          />
        </CardContent>
      </Card>

      {/* List of items on map */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
          รายการจุดงาน & กล่องข้อความบนผัง ({filteredMarkers.length})
        </Typography>

        <Grid container spacing={2}>
          {filteredMarkers.map((m) => {
            const iconObj = SITE_ICONS.find((i) => i.type === m.icon);
            const isSelected = m.id === activeMarkerId;

            return (
              <Grid key={m.id} size={{ xs: 12, sm: 6, md: 4 }}>
                <Card
                  onClick={() => setActiveMarkerId(m.id)}
                  sx={{
                    cursor: "pointer",
                    border: "2px solid",
                    borderColor: isSelected ? m.color : "divider",
                    boxShadow: isSelected ? `0 4px 16px ${m.color}33` : "none",
                    borderRadius: 2,
                    transition: "all 0.15s ease",
                    "&:hover": { borderColor: m.color, transform: "translateY(-2px)" },
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
                    </Stack>

                    <Typography variant="body2" sx={{ fontWeight: 700, color: "text.primary", mt: 0.5, fontSize: 13.5 }}>
                      {m.text}
                    </Typography>

                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                      บันทึกเมื่อ: {m.createdAt}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      </Box>
    </Box>
  );
}

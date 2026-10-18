import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ChevronRightIcon from "@mui/icons-material/ChevronRightOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import ExpandMoreIcon from "@mui/icons-material/ExpandMoreOutlined";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUncheckedOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import InputAdornment from "@mui/material/InputAdornment";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { SITE_MAP_VIEW_LIST } from "@/features/site-plan/index.js";
import type { SiteMapEditor } from "../hooks/use-site-map-editor.js";

export function FacilityListPanel({ ed }: { ed: SiteMapEditor }) {
  const { writer, view, search, setSearch, buildingId, setMode, setPendingPoint, setPart, saving, setPendingConfirm, buildings, building, configured, filtered, guardDiscard, chooseBuilding, run, currentPoint, VIEW_LABEL } = ed;
  return (
    <>
    <Box sx={{ p: 1.5, pb: 0.5 }}>
      <TextField
        size="small"
        fullWidth
        placeholder="Search facilities…"
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
                color="error"
                startIcon={<DeleteOutlineOutlinedIcon />}
                sx={{ mt: 1 }}
                disabled={saving}
                onClick={() =>
                  setPendingConfirm({
                    title: `Delete marker in ${VIEW_LABEL[view]}?`,
                    description: `หมุด ${building.name} จะถูกลบออกจากมุมมองนี้`,
                    run: () =>
                      run(async () => {
                        await writer.setBuildingMarker(building.id, view, null);
                        setPendingPoint(null);
                      }),
                  })
                }
              >
                Delete marker in this view
              </Button>
            ) : null}
          </AccordionDetails>
        </Accordion>
        <Button
          fullWidth
          variant="outlined"
          endIcon={<ChevronRightIcon />}
          sx={{ mt: 1.25, justifyContent: "space-between" }}
          onClick={() => {
            guardDiscard(() => {
              setPendingPoint(null);
              setMode("parts");
              setPart(null);
            });
          }}
        >
          Work Parts configuration ({building.parts.length})
        </Button>
      </Box>
    ) : null}
  </>
  );
}

import RestartAltOutlinedIcon from "@mui/icons-material/RestartAltOutlined";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import type { UseWorkPermitsViewState } from "../hooks/use-work-permits-view.js";

export function PermitToolbar({ ed }: { ed: UseWorkPermitsViewState }) {
  const { from, setFrom, to, setTo, building, setBuilding, contractor, setContractor, namesByCode, activePreset, handlePresetChange, buildingOptions, contractorOptions, clearAll, isFiltered } = ed;
  return (
    <Card variant="outlined" sx={{ p: 1.25, mb: 2, borderRadius: 2, bgcolor: "background.paper" }}>
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={1.5}
        alignItems={{ xs: "stretch", md: "center" }}
        justifyContent="space-between"
        flexWrap="wrap"
        useFlexGap
      >
        {/* Quick Date Presets & Pickers */}
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={activePreset}
            onChange={handlePresetChange}
            sx={{ bgcolor: "grey.50" }}
          >
            <ToggleButton value="today" sx={{ px: 1.5, py: 0.5, fontSize: "0.8rem", textTransform: "none", fontWeight: 600 }}>
              วันนี้
            </ToggleButton>
            <ToggleButton value="tomorrow" sx={{ px: 1.5, py: 0.5, fontSize: "0.8rem", textTransform: "none", fontWeight: 600 }}>
              พรุ่งนี้
            </ToggleButton>
            <ToggleButton value="week" sx={{ px: 1.5, py: 0.5, fontSize: "0.8rem", textTransform: "none", fontWeight: 600 }}>
              สัปดาห์นี้
            </ToggleButton>
            <ToggleButton value="month" sx={{ px: 1.5, py: 0.5, fontSize: "0.8rem", textTransform: "none", fontWeight: 600 }}>
              เดือนนี้
            </ToggleButton>
          </ToggleButtonGroup>

          <Stack direction="row" spacing={0.75} alignItems="center">
            <DatePicker
              label="จาก"
              value={from}
              onChange={setFrom}
              slotProps={{ textField: { size: "small", sx: { width: 135 } } }}
            />
            <Typography variant="body2" color="text.secondary">
              –
            </Typography>
            <DatePicker
              label="ถึง"
              value={to}
              onChange={setTo}
              slotProps={{ textField: { size: "small", sx: { width: 135 } } }}
            />
          </Stack>
        </Stack>

        {/* Location & Contractor Selects */}
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel id="wp-building">อาคาร</InputLabel>
            <Select
              labelId="wp-building"
              label="อาคาร"
              value={building}
              onChange={(e) => setBuilding(e.target.value)}
            >
              <MenuItem value="">ทุกอาคาร</MenuItem>
              {buildingOptions.map((b) => (
                <MenuItem key={b} value={b}>
                  {b}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel id="wp-contractor">ผู้รับเหมา</InputLabel>
            <Select
              labelId="wp-contractor"
              label="ผู้รับเหมา"
              value={contractor}
              onChange={(e) => setContractor(e.target.value)}
            >
              <MenuItem value="">ทุกคน</MenuItem>
              {contractorOptions.map((c) => (
                <MenuItem key={c} value={c}>
                  {c} · {namesByCode.get(c) ?? ""}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {isFiltered && (
            <Button
              variant="outlined"
              color="inherit"
              startIcon={<RestartAltOutlinedIcon fontSize="small" />}
              onClick={clearAll}
              sx={{ textTransform: "none" }}
            >
              ล้างตัวกรอง
            </Button>
          )}
        </Stack>
      </Stack>
    </Card>
  );
}

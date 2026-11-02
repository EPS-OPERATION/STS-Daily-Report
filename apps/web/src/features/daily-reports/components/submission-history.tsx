import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import Box from "@mui/material/Box";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import type { UseDailyReportsPageState } from "../hooks/use-daily-reports-page.js";

export function SubmissionHistory({ ed }: { ed: UseDailyReportsPageState }) {
  const { viewMode, setViewMode } = ed;
  return (
    <Box sx={{ mb: 2.5 }}>
      <ToggleButtonGroup
        value={viewMode}
        exclusive
        onChange={(_, val) => val && setViewMode(val)}
        size="small"
        sx={{ bgcolor: "background.paper" }}
      >
        <ToggleButton value="work-summary" sx={{ textTransform: "none", fontWeight: 700, px: 2.5, py: 1, gap: 1 }}>
          <AssignmentOutlinedIcon fontSize="small" />
          สรุปรายการเนื้องาน (Work Done Summary)
        </ToggleButton>
        <ToggleButton value="history" sx={{ textTransform: "none", fontWeight: 700, px: 2.5, py: 1, gap: 1 }}>
          <HistoryOutlinedIcon fontSize="small" />
          ประวัติการส่งรายงาน (Submission History)
        </ToggleButton>
      </ToggleButtonGroup>
    </Box>
  );
}

import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import { isoWeekLabel, mondayOf } from "@sts/shared";
import dayjs from "dayjs";
import { addDaysIso } from "@/lib/dates.js";
import { isFullWeek } from "../utils/finding-no.js";

// «2026-W43 · 19–25 Oct»: steps the page range one ISO week (Mon–Sun) at a time, the unit of the
// weekly Line Walk report. A custom range shows the week of its start date; clicking the label snaps to it.
export function WeekStepper({ from, to, onChange }: { from: string; to: string; onChange: (from: string, to: string) => void }) {
  const start = mondayOf(from);
  const end = addDaysIso(start, 6);
  const full = isFullWeek(from, to);
  const go = (weeks: number) => {
    const s = addDaysIso(start, weeks * 7);
    onChange(s, addDaysIso(s, 6));
  };
  const a = dayjs(start);
  const b = dayjs(end);
  const span = a.month() === b.month() ? `${a.date()}–${b.format("D MMM")}` : `${a.format("D MMM")} – ${b.format("D MMM")}`;
  return (
    <Stack
      direction="row"
      alignItems="center"
      sx={{ height: 40, border: 1, borderColor: "divider", borderRadius: 1, bgcolor: "background.paper", pl: 0.25, pr: 0.25 }}
    >
      <Tooltip title="Previous week">
        <IconButton size="small" aria-label="Previous week" onClick={() => go(-1)}>
          <ArrowBackIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      {/* describeChild: the tooltip describes the button instead of replacing its «2026-W43 · …» name */}
      <Tooltip describeChild title={full ? "Selected week" : "Custom range — click to select the whole week"}>
        <Button
          size="small"
          color={full ? "inherit" : "primary"}
          onClick={() => !full && onChange(start, end)}
          sx={{ minWidth: 176, textTransform: "none", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}
        >
          {isoWeekLabel(start)} · {span}
        </Button>
      </Tooltip>
      <Tooltip title="Next week">
        <IconButton size="small" aria-label="Next week" onClick={() => go(1)}>
          <ArrowForwardIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Stack>
  );
}

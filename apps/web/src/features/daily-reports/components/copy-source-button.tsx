import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import ContentCopyOutlinedIcon from "@mui/icons-material/ContentCopyOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ButtonGroup from "@mui/material/ButtonGroup";
import Chip from "@mui/material/Chip";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { useCurrentReport, useReviewQueue } from "../hooks/use-daily-report-queries.js";
import { addDaysIso, formatThaiDate } from "../utils/dates.js";

// How far back a contractor can pick a morning report to start from (same span as History).
export const COPY_LOOKBACK_DAYS = 14;

const shortThaiDate = (iso: string) => formatThaiDate(iso).split(" ").slice(0, 2).join(" ");

// Morning reports this contractor sent before `date`, newest first.
export function useCopySources(projectId: string | null, contractorId: string | undefined, date: string) {
  const queue = useReviewQueue(projectId, { from: addDaysIso(date, -COPY_LOOKBACK_DAYS), to: addDaysIso(date, -1) });
  const sources = (queue.data?.data ?? [])
    .filter((r) => r.contractorId === contractorId && r.morningStatus === "submitted")
    .sort((a, b) => b.reportDate.localeCompare(a.reportDate));
  return { sources, isLoading: queue.isLoading };
}

// Split button: the main part uses the newest sent morning report and says which day it is and what
// it brings; the arrow lists the other sent days. Renders nothing when there is no report to copy.
export function CopySourceButton({
  projectId,
  contractorId,
  date,
  disabled,
  onPick,
}: {
  projectId: string | null;
  contractorId: string | undefined;
  date: string;
  disabled?: boolean;
  onPick: (sourceDate: string) => void;
}) {
  const { sources } = useCopySources(projectId, contractorId, date);
  const latest = sources[0];
  const detail = useCurrentReport(projectId, latest?.reportDate ?? date, contractorId, Boolean(latest && contractorId));
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  if (!latest) return null;

  const r = detail.data?.data.report;
  const summary = r
    ? `${r.totalHeadcount} คน · ${r.allocations.length} งาน · ${r.equipment.reduce((n, e) => n + e.qty, 0)} เครื่องจักร`
    : `${latest.totalHeadcount} คน`;

  return (
    <Box>
      <ButtonGroup size="small" variant="outlined" disabled={disabled} aria-label="เลือกรายงานที่จะใช้ข้อมูล">
        <Button startIcon={<ContentCopyOutlinedIcon fontSize="small" />} onClick={() => onPick(latest.reportDate)} sx={{ textTransform: "none" }}>
          ใช้ข้อมูลจาก {shortThaiDate(latest.reportDate)}
        </Button>
        {sources.length > 1 ? (
          <Button aria-label="เลือกวันอื่น" aria-haspopup="menu" onClick={(e) => setAnchor(e.currentTarget)} sx={{ px: 0.5 }}>
            <ArrowDropDownIcon />
          </Button>
        ) : null}
      </ButtonGroup>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
        {summary}
      </Typography>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
        {sources.map((s, i) => (
          <MenuItem
            key={s.reportDate}
            onClick={() => {
              setAnchor(null);
              onPick(s.reportDate);
            }}
          >
            <ListItemText primary={formatThaiDate(s.reportDate)} secondary={`${s.totalHeadcount} คน`} />
            {i === 0 ? <Chip size="small" label="ล่าสุด" sx={{ ml: 1.5 }} /> : null}
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
}

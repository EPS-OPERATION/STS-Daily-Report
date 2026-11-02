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
import { alpha } from "@mui/material/styles";
import { useState } from "react";
import { useCurrentReport, useReviewQueue } from "../hooks/use-daily-report-queries.js";
import { addDaysIso, formatThaiDate } from "@/lib/dates.js";

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

// Morning form header panel: names the newest sent morning report and what copying brings over,
// with "use it" as the main action and the other sent days behind "เลือกวันอื่น".
// Renders nothing when there is no earlier report to start from.
export function CopySourcePanel({
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
  const facts = r
    ? [`${r.totalHeadcount} คน`, `${r.allocations.length} งาน`, `${r.equipment.reduce((n, e) => n + e.qty, 0)} เครื่องจักร`]
    : [`${latest.totalHeadcount} คน`];

  return (
    <Box
      sx={{
        mb: 2,
        p: { xs: 1.5, sm: 2 },
        border: 1,
        borderColor: "divider",
        borderRadius: 2,
        bgcolor: "background.paper",
        display: "flex",
        flexDirection: { xs: "column", sm: "row" },
        alignItems: { sm: "center" },
        gap: { xs: 1.5, sm: 2 },
      }}
    >
      <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-start", flex: 1, minWidth: 0 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            flexShrink: 0,
            borderRadius: 1.5,
            display: "grid",
            placeItems: "center",
            bgcolor: (t) => alpha(t.palette.primary.main, 0.08),
            color: "primary.main",
            border: 1,
            borderColor: (t) => alpha(t.palette.primary.main, 0.2),
          }}
        >
          <ContentCopyOutlinedIcon fontSize="small" />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
            เริ่มจากรายงานเช้าล่าสุด
          </Typography>
          <Typography variant="body2" sx={{ fontVariantNumeric: "tabular-nums" }}>
            {formatThaiDate(latest.reportDate)}
            <Box component="span" sx={{ color: "text.secondary" }}>
              {" · "}
              {facts.join(" · ")}
            </Box>
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
            คัดลอกมาให้ แก้ไขได้ทุกช่องก่อนส่ง
          </Typography>
        </Box>
      </Box>
      <Box sx={{ display: "flex", gap: 1, flexShrink: 0 }}>
        <Button
          variant="contained"
          disableElevation
          disabled={disabled}
          onClick={() => onPick(latest.reportDate)}
          sx={{ flex: { xs: 1, sm: "none" }, minHeight: 40, whiteSpace: "nowrap" }}
        >
          ใช้ข้อมูลนี้
        </Button>
        {sources.length > 1 ? (
          <Button
            variant="outlined"
            disabled={disabled}
            endIcon={<ArrowDropDownIcon />}
            aria-haspopup="menu"
            onClick={(e) => setAnchor(e.currentTarget)}
            sx={{ flex: { xs: 1, sm: "none" }, minHeight: 40, whiteSpace: "nowrap" }}
          >
            เลือกวันอื่น
          </Button>
        ) : null}
      </Box>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", px: 2, pt: 0.5, pb: 1 }}>
          รายงานเช้าที่ส่งแล้ว ย้อนหลัง {COPY_LOOKBACK_DAYS} วัน
        </Typography>
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

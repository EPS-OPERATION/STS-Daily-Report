import type { SvgIconProps } from "@mui/material/SvgIcon";
import { type ComponentType, type ReactNode } from "react";
import { Link as RouterLink } from "react-router-dom";
import { StatusChip } from "@/components/ui/status-chip.js";
import { addDaysIso, formatThaiDate, clockTime } from "@/lib/dates.js";
import { type ReviewQueueRow } from "@/features/daily-reports/index.js";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import dayjs from "dayjs";

export const HISTORY_DAYS = 14;

export const HISTORY_PAGE = 5;

export function TaskRow({
  icon: Icon,
  tone,
  title,
  caption,
  below,
  action,
}: {
  icon: ComponentType<SvgIconProps>;
  tone: "success" | "warning" | "info";
  title: string;
  caption: string;
  /** Optional secondary action under the caption (keeps the row wide on phones). */
  below?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minHeight: 44 }}>
      <Icon color={tone} aria-hidden="true" />
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Typography variant="body1" sx={{ fontWeight: 600 }}>
          {title}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {caption}
        </Typography>
        {below ? <Box>{below}</Box> : null}
      </Box>
      {action}
    </Stack>
  );
}

export function HistoryRow({
  row,
  today,
  editable,
  to,
}: {
  row: ReviewQueueRow;
  today: string;
  editable: boolean;
  to: string;
}) {
  const morning = row.morningStatus === "submitted";
  const evening = row.eveningStatus === "submitted";
  const anySent = morning || evening;
  const relative = row.reportDate === today ? "วันนี้" : row.reportDate === addDaysIso(today, -1) ? "เมื่อวาน" : null;
  // Only today's and yesterday's reports can still be inside the window.
  const until = row.reportDate === today ? "ถึงพรุ่งนี้ 12:00" : "ถึงวันนี้ 12:00";

  return (
    <Box component="li" sx={{ px: 2.5, py: 1.5, borderTop: 1, borderColor: "divider" }}>
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Stack direction="row" spacing={1} alignItems="baseline">
            <Typography variant="body1" sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
              {formatThaiDate(row.reportDate)}
            </Typography>
            {relative ? (
              <Typography variant="caption" color="text.secondary">
                {relative}
              </Typography>
            ) : null}
          </Stack>
          <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" sx={{ mt: 0.75 }}>
            <StatusChip
              status={morning ? "submitted" : "draft"}
              label={
                morning
                  ? `Daily Report${row.morningUpdatedAt && dayjs(row.morningUpdatedAt).diff(dayjs(row.morningSubmittedAt), "minute") >= 1 ? ` (แก้ ${clockTime(row.morningUpdatedAt)})` : row.morningSubmittedAt ? ` (${clockTime(row.morningSubmittedAt)})` : ""}`
                  : "Daily Report ยังไม่ส่ง"
              }
            />
            <StatusChip
              status={evening ? "submitted" : "draft"}
              label={
                evening
                  ? `Daily Request${row.eveningUpdatedAt && dayjs(row.eveningUpdatedAt).diff(dayjs(row.eveningSubmittedAt), "minute") >= 1 ? ` (แก้ ${clockTime(row.eveningUpdatedAt)})` : row.eveningSubmittedAt ? ` (${clockTime(row.eveningSubmittedAt)})` : ""}`
                  : "Daily Request ยังไม่ส่ง"
              }
            />
          </Stack>
          {/* The 12:00 rule only reaches today and yesterday (trial mode leaves older days editable). */}
          {editable && anySent && relative ? (
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.75 }}>
              แก้ไขได้{until} น.
            </Typography>
          ) : !editable && anySent && relative ? (
            // Only worth saying where the window just closed; the section subtitle states the rule.
            <Typography variant="caption" color="text.disabled" sx={{ display: "block", mt: 0.75 }}>
              ปิดแก้ไขแล้ว
            </Typography>
          ) : null}
        </Box>
        <Stack alignItems="flex-end" sx={{ flexShrink: 0 }}>
          <Stack direction="row" spacing={0.5} alignItems="center">
            {evening && row.id ? (
              <Tooltip title="Export PDF">
                <IconButton
                  size="small"
                  aria-label={`Export PDF ${formatThaiDate(row.reportDate)}`}
                  onClick={() => window.open(`/daily-reports/${row.id}/print`, "_blank", "noopener")}
                >
                  <PictureAsPdfOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            ) : null}
            <Button
              component={RouterLink}
              to={to}
              variant={editable && anySent ? "contained" : "outlined"}
              sx={{ minWidth: 64 }}
            >
              {editable ? (anySent ? "แก้ไข" : "ส่ง") : "ดู"}
            </Button>
          </Stack>
        </Stack>
      </Stack>
    </Box>
  );
}

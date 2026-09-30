import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import Box from "@mui/material/Box";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

// Real-time allocation status. Sticky so the counter stays visible while the
// contractor scrolls through building cards on a phone.
export function AllocationTracker({ total, allocated }: { total: number; allocated: number }) {
  const remaining = total - allocated;
  const balanced = total > 0 && remaining === 0;
  const over = remaining < 0;
  const pct = total > 0 ? Math.min(100, (allocated / total) * 100) : 0;

  return (
    <Box
      role="status"
      aria-live="polite"
      sx={{
        position: "sticky",
        top: 72, // below the 64px sticky app bar
        zIndex: 2,
        bgcolor: "navy.dark",
        color: "common.white",
        borderRadius: 2,
        px: 2,
        py: 1.5,
        mb: 2,
      }}
    >
      <Stack direction="row" justifyContent="space-between" spacing={1} sx={{ mb: 1 }}>
        <Metric label="จำนวนคนทั้งหมด" value={total} />
        <Metric label="จัดสรรแล้ว" value={allocated} />
        <Metric label="คงเหลือ" value={remaining} tone={balanced ? "ok" : "warn"} />
      </Stack>
      <LinearProgress
        variant="determinate"
        value={pct}
        color={balanced ? "success" : "warning"}
        sx={{ height: 8, borderRadius: 4, bgcolor: "rgba(255,255,255,0.2)" }}
      />
      <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 1 }}>
        {balanced ? (
          <CheckCircleOutlineIcon sx={{ fontSize: 16, color: "success.light" }} />
        ) : (
          <WarningAmberOutlinedIcon sx={{ fontSize: 16, color: "warning.main" }} />
        )}
        <Typography variant="caption" sx={{ color: balanced ? "success.light" : "warning.light" }}>
          {total === 0
            ? "กรอกจำนวนคนเข้างานก่อน แล้วจัดสรรลงอาคาร"
            : balanced
              ? "จัดสรรครบ 100% — ส่งรายงานเช้าได้"
              : over
                ? `จัดสรรเกิน ${-remaining} คน — ลดจำนวนคนในอาคาร`
                : `ยังไม่ได้ลงอาคาร ${remaining} คน — ส่งรายงานเช้าไม่ได้จนกว่าจะครบ`}
        </Typography>
      </Stack>
    </Box>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone?: "ok" | "warn" }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.72)", display: "block" }}>
        {label}
      </Typography>
      <Typography
        variant="h4"
        component="span"
        sx={{
          color: tone === "warn" ? "warning.main" : tone === "ok" ? "success.light" : "common.white",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </Typography>
      <Typography variant="caption" component="span" sx={{ color: "rgba(255,255,255,0.72)", ml: 0.5 }}>
        คน
      </Typography>
    </Box>
  );
}

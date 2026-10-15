import type { CoordinationDayLock } from "@sts/shared";
import LockOpenOutlined from "@mui/icons-material/LockOpenOutlined";
import LockOutlined from "@mui/icons-material/LockOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import dayjs from "dayjs";

const STAMP_GREEN = "#15803D";

// Green bar above the map while the day is locked (EPS stamp), with the unlock action for EPS.
export function DayLockBanner({ lock, canUnlock, busy, onUnlock }: { lock: CoordinationDayLock; canUnlock: boolean; busy: boolean; onUnlock: () => void }) {
  return (
    <Stack direction="row" spacing={1.25} alignItems="center" flexWrap="wrap" useFlexGap
      sx={{ px: 1.5, py: 1, borderBottom: "1px solid", borderColor: "divider", bgcolor: "rgba(21, 128, 61, 0.08)" }}>
      <LockOutlined sx={{ color: STAMP_GREEN, fontSize: 20 }} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" sx={{ fontWeight: 700, color: STAMP_GREEN }}>
          ล็อกแผนวันนี้แล้ว — แก้ไขไม่ได้
        </Typography>
        <Typography variant="caption" color="text.secondary">
          โดย {lock.lockedByName ?? "EPS"} · {dayjs(lock.lockedAt).format("D MMM YYYY HH:mm")}
          {canUnlock ? " · ต้องปลดล็อกก่อนจึงจะแก้ไขได้" : ""}
        </Typography>
      </Box>
      {canUnlock ? (
        <Button variant="outlined" color="inherit" startIcon={<LockOpenOutlined fontSize="small" />} disabled={busy} onClick={onUnlock} sx={{ textTransform: "none", whiteSpace: "nowrap", bgcolor: "background.paper" }}>
          ปลดล็อก
        </Button>
      ) : null}
    </Stack>
  );
}

// Rubber-stamp mark drawn on the map (bottom-left) while the day is locked.
export function DayLockStamp({ lock, date, small = false }: { lock: CoordinationDayLock; date: string; small?: boolean }) {
  return (
    <Box
      aria-hidden
      sx={{
        position: "absolute",
        left: small ? 10 : 18,
        bottom: small ? 10 : 18,
        zIndex: 2,
        pointerEvents: "none",
        transform: "rotate(-7deg)",
        px: small ? 1.25 : 2,
        py: small ? 0.5 : 0.9,
        border: `${small ? 2 : 3}px double ${STAMP_GREEN}`,
        borderRadius: 1.5,
        color: STAMP_GREEN,
        bgcolor: "rgba(255, 255, 255, 0.82)",
        textAlign: "center",
        lineHeight: 1.15,
      }}
    >
      <Typography sx={{ fontWeight: 700, fontSize: small ? 12 : 17, letterSpacing: "0.04em", color: "inherit" }}>ล็อกแผนแล้ว</Typography>
      <Typography sx={{ fontWeight: 700, fontSize: small ? 9 : 11, letterSpacing: "0.18em", color: "inherit" }}>LOCKED · {dayjs(date).format("DD/MM/YY")}</Typography>
      {!small ? (
        <Typography sx={{ fontSize: 10.5, color: "inherit", opacity: 0.9 }}>{lock.lockedByName ?? "EPS"}</Typography>
      ) : null}
    </Box>
  );
}

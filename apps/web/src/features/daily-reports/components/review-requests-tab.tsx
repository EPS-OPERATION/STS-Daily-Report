import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import PrecisionManufacturingOutlinedIcon from "@mui/icons-material/PrecisionManufacturingOutlined";
import RouteOutlinedIcon from "@mui/icons-material/RouteOutlined";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { EmptySection } from "@/components/ui/empty-state.js";
import { timeWindowLabel } from "@/lib/dates.js";
import { permitLabel } from "@/features/daily-requests/index.js";
import type { UseReviewDialogState } from "../hooks/use-review-dialog.js";

export function ReviewRequestsTab({ ed }: { ed: UseReviewDialogState }) {
  const { data } = ed;
  if (!data) return null;
  return (
    <Stack spacing={2}>
      <Typography variant="subtitle2" color="text.secondary">
        รายการคำขอสำหรับวันพรุ่งนี้ (ส่งเพื่อเข้าประชุมประสานงานเวลา 17:00 น.)
      </Typography>

      <Card variant="outlined">
        <CardContent sx={{ p: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
            🚜 ขอจองเครื่องจักรหนัก (Machinery)
          </Typography>
          {data.machinery.length === 0 ? (
            <EmptySection dense icon={<PrecisionManufacturingOutlinedIcon />} title="ไม่มีรายการขอจองเครื่องจักร" />
          ) : (
            <Stack spacing={1}>
              {data.machinery.map((m) => (
                <Box key={m.id} sx={{ p: 1.5, bgcolor: "grey.50", borderRadius: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {m.machineType} {m.unitTag ? `(${m.unitTag})` : ""} · อาคาร {m.buildingCode}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                    เวลา: {timeWindowLabel(m.startTime, m.endTime)} · วัตถุประสงค์: {m.purpose || "—"}
                  </Typography>
                </Box>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent sx={{ p: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
            📋 ขอใบอนุญาตทำงานเสี่ยง (Permit to Work - PTW)
          </Typography>
          {data.permits.length === 0 ? (
            <EmptySection dense icon={<AssignmentOutlinedIcon />} title="ไม่มีการขอใบอนุญาตทำงานเสี่ยง" />
          ) : (
            <Stack spacing={1}>
              {data.permits.map((p) => (
                <Box key={p.id} sx={{ p: 1.5, bgcolor: "grey.50", borderRadius: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {p.permitType === "other" ? p.otherLabel : permitLabel(p.permitType)} · อาคาร {p.buildingCode}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    จำนวนผู้ปฏิบัติงานภายใต้ใบอนุญาต: {p.workers} คน
                  </Typography>
                </Box>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent sx={{ p: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
            🛣️ ขอใช้เส้นทาง / ปิดถนน (Road Usage)
          </Typography>
          {data.roadUsage.length === 0 ? (
            <EmptySection dense icon={<RouteOutlinedIcon />} title="ไม่มีการขอใช้เส้นทางสัญจร" />
          ) : (
            <Stack spacing={1}>
              {data.roadUsage.map((r) => (
                <Box key={r.id} sx={{ p: 1.5, bgcolor: "grey.50", borderRadius: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {r.roadLocation}{r.buildingCode ? ` · อาคาร ${r.buildingCode}` : ""}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                    เวลา: {r.startTime}–{r.endTime} · วัตถุประสงค์: {r.purpose}
                  </Typography>
                </Box>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>
    </Stack>
  );
}

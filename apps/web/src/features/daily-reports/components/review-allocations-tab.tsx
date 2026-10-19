import ApartmentOutlinedIcon from "@mui/icons-material/ApartmentOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { EmptySection } from "@/components/ui/empty-state.js";
import type { UseReviewDialogState } from "../hooks/use-review-dialog.js";

export function ReviewAllocationsTab({ ed }: { ed: UseReviewDialogState }) {
  const { data } = ed;
  if (!data) return null;
  return (
    <Stack spacing={2}>
      <Typography variant="subtitle2" color="text.secondary">
        จัดสรรกำลังคนและผลงานจริงเทียบกับแผนงาน ({data.allocations.length} พื้นที่/อาคาร)
      </Typography>
      {data.allocations.length === 0 ? (
        <EmptySection dense icon={<ApartmentOutlinedIcon />} title="ไม่มีการบันทึกการจัดสรรงานลงอาคาร" />
      ) : (
        data.allocations.map((a) => {
          const isBehind = a.planPercent !== null && (a.actualPercent ?? 0) < a.planPercent;
          return (
            <Card key={a.id} variant="outlined" sx={{ borderColor: isBehind ? "warning.main" : "divider" }}>
              <CardContent sx={{ p: 2 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1 }}>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      {a.buildingName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      จำนวนคนเข้าทำงาน: {a.headcount} คน
                    </Typography>
                  </Box>
                  {a.isAdditional ? (
                    <Chip size="small" color="info" label="งานเพิ่มเติม" sx={{ fontWeight: 600 }} />
                  ) : (
                    <Chip
                      size="small"
                      color={isBehind ? "warning" : "success"}
                      label={isBehind ? "Behind plan" : "On plan"}
                    />
                  )}
                </Stack>

                <Typography variant="body2" sx={{ mb: 1.5, color: "text.primary" }}>
                  {a.workDescription}
                </Typography>

                <Box sx={{ mb: 1 }}>
                  <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">
                      ผลงานจริง: {a.actualPercent ?? 0}%
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      แผนงาน: {a.planPercent === null ? "—" : `${a.planPercent}%`}
                    </Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(100, a.actualPercent ?? a.planPercent ?? 0)}
                    color={isBehind ? "warning" : "success"}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>

                {a.countermeasure ? (
                  <Alert severity="warning" sx={{ mt: 1.5, py: 0.5 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, display: "block" }}>
                      มาตรการแก้ไข (Countermeasure):
                    </Typography>
                    <Typography variant="caption">{a.countermeasure}</Typography>
                  </Alert>
                ) : null}
              </CardContent>
            </Card>
          );
        })
      )}
    </Stack>
  );
}

import { Link as RouterLink } from "react-router-dom";
import { SectionCard } from "./section-card.js";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { ProgressRow } from "./evening-progress-row.js";
import type { UseEveningFormState } from "../hooks/use-evening-form.js";

export function EveningProgressSection({ ed }: { ed: UseEveningFormState }) {
  const { allocations, control, progress, date, contractor } = ed;
  return (
    <SectionCard id="sec-progress" index={4} tone="navy" title="ผลงานจริงรายอาคาร (Status % vs Plan %)" subtitle="ดึงแผนจากรายงานเช้า">
      {allocations.length === 0 ? (
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }} justifyContent="space-between"
          sx={{ p: 1.5, border: 1, borderStyle: "dashed", borderColor: "divider", borderRadius: 2 }}>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              ไม่มีงานจากรายงานเช้า — ข้ามหัวข้อนี้ได้
            </Typography>
            <Typography variant="caption" color="text.secondary">
              ถ้าต้องการบันทึกผลงานรายอาคาร ให้ส่งรายงานเช้าของวันนี้ก่อน
            </Typography>
          </Box>
          <Button component={RouterLink} to={`/field/report?date=${date}&contractor=${contractor.id}&shift=morning`} variant="outlined" size="small" sx={{ flexShrink: 0, minHeight: 40 }}>
            ไปกรอกรายงานเช้า
          </Button>
        </Stack>
      ) : (
        <Stack spacing={1.5}>
          {progress.fields.map((row, i) => (
            <ProgressRow key={row.id} index={i} control={control} allocation={allocations[i]!} />
          ))}
        </Stack>
      )}
    </SectionCard>
  );
}

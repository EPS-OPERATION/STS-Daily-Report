import { Link as RouterLink } from "react-router-dom";
import { SectionCard } from "./section-card.js";
import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { ProgressTable } from "./progress-table.js";
import { AdditionalWorkRow } from "./evening-additional-work-row.js";
import type { UseEveningFormState } from "../hooks/use-evening-form.js";

export function EveningProgressSection({ ed }: { ed: UseEveningFormState }) {
  const {
    morningAllocations,
    control,
    progress,
    additional,
    onAddAdditional,
    date,
    contractor,
    buildings,
    picked,
  } = ed;

  const hasMorning = morningAllocations.length > 0;
  const hasAdditional = additional.fields.length > 0;

  return (
    <SectionCard
      id="sec-progress"
      index={4}
      tone="navy"
      title="ผลงานจริงรายอาคาร (Status % vs Plan %)"
      subtitle="ดึงแผนจากรายงานเช้า และบันทึกงานเพิ่มเติม"
    >
      <Stack spacing={2}>
        {!hasMorning && !hasAdditional ? (
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1.5}
            alignItems={{ sm: "center" }}
            justifyContent="space-between"
            sx={{ p: 1.5, border: 1, borderStyle: "dashed", borderColor: "divider", borderRadius: 2 }}
          >
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                ไม่มีงานจากรายงานเช้า — ข้ามหัวข้อนี้ได้ หรือบันทึกงานเพิ่มเติม
              </Typography>
              <Typography variant="caption" color="text.secondary">
                หากมีงานนอกแผน หรือทำงานได้เร็วกว่าแผน สามารถกดเพิ่มงานเพิ่มเติมได้ทันที
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Button
                variant="contained"
                size="small"
                startIcon={<AddOutlinedIcon />}
                onClick={onAddAdditional}
                sx={{ flexShrink: 0, minHeight: 40 }}
              >
                เพิ่มงานเพิ่มเติม
              </Button>
              <Button
                component={RouterLink}
                to={`/field/report?date=${date}&contractor=${contractor.id}&shift=morning`}
                variant="outlined"
                size="small"
                sx={{ flexShrink: 0, minHeight: 40 }}
              >
                ไปกรอกรายงานเช้า
              </Button>
            </Stack>
          </Stack>
        ) : null}

        {/* Morning planned items */}
        {hasMorning ? (
          <Stack spacing={1.5}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", textTransform: "uppercase" }}>
              งานตามแผนรอบเช้า ({morningAllocations.length} รายการ)
            </Typography>
            <ProgressTable control={control} allocations={morningAllocations.slice(0, progress.fields.length)} />
          </Stack>
        ) : null}

        {/* Additional work items */}
        {hasAdditional ? (
          <Stack spacing={1.5}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: "info.main", textTransform: "uppercase" }}>
              งานเพิ่มเติม / นอกแผน ({additional.fields.length} รายการ)
            </Typography>
            {additional.fields.map((row, i) => (
              <AdditionalWorkRow
                key={row.id}
                index={i}
                control={control}
                buildings={buildings}
                onRemove={() => additional.remove(i)}
                activeDisciplines={picked}
              />
            ))}
          </Stack>
        ) : null}

        {/* Button to add extra work when morning tasks or existing additional tasks are present */}
        {hasMorning || hasAdditional ? (
          <Box>
            <Button
              variant="outlined"
              size="small"
              startIcon={<AddOutlinedIcon />}
              onClick={onAddAdditional}
              sx={{ minHeight: 36 }}
            >
              เพิ่มงานเพิ่มเติม / งานนอกแผน
            </Button>
          </Box>
        ) : null}
      </Stack>
    </SectionCard>
  );
}

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";
import { PageHeader } from "@/components/ui/page-header.js";
import { QueryError } from "@/components/ui/query-error.js";
import { BlockSkeleton } from "@/components/ui/skeletons.js";
import { formatNumber } from "@/lib/format.js";
import { ContractorFilterPopover } from "@/features/contractors/index.js";
import { useManpowerPage, MAX_DAYS } from "../hooks/use-manpower-page.js";
import { FilterBanner } from "../components/filter-banner.js";
import { ManpowerCharts } from "../components/manpower-charts.js";
import { Figure } from "../components/manpower-parts.js";

// Manpower analytics from contractor morning reports (deck p.20/24/25 + v2 notes):
// pick any date range on the calendar; charts by day, building, position, nationality;
// with Excel-style checkbox filter for contractors.
export function ManpowerPage() {
  const ed = useManpowerPage();
  const { from, to, span, tooLong, summary, setRange, showToday, activePreset, thisWeek, thisMonth, data, error, allCodes, selectedCodes, updateContractorSelection, selectAllContractors, filterItems, isFiltered, isNoneSelected, totals, wide } = ed;
  // Shown companies whose NMH includes afternoon-only days (standard 8 h per person).
  const estimated = (data?.contractors ?? []).filter((c) => c.estimatedDays > 0 && selectedCodes.has(c.contractorCode));

  return (
    <Box>
      <PageHeader
        title="กำลังคน (Manpower)"
        subtitle="จากรายงานเช้าของผู้รับเหมา · เลือกช่วงวันที่และกรองผู้รับเหมาตามต้องการ"
        actions={
          <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
            <DatePicker
              label="From"
              value={dayjs(from)}
              onChange={(v) => v?.isValid() && setRange(v.format("YYYY-MM-DD"), to)}
              format="D MMM YYYY"
              slotProps={{ textField: { size: "small", sx: { width: 155 } } }}
            />
            <DatePicker
              label="To"
              value={dayjs(to)}
              minDate={dayjs(from)}
              onChange={(v) => v?.isValid() && setRange(from, v.format("YYYY-MM-DD"))}
              format="D MMM YYYY"
              slotProps={{ textField: { size: "small", sx: { width: 155 } } }}
            />
            <Button variant={activePreset === "today" ? "contained" : "outlined"} onClick={showToday}>
              Today
            </Button>
            <Button variant={activePreset === "week" ? "contained" : "outlined"} onClick={thisWeek}>
              This week
            </Button>
            <Button variant={activePreset === "month" ? "contained" : "outlined"} onClick={thisMonth}>
              This month
            </Button>
            {allCodes.length > 0 && (
              <ContractorFilterPopover
                items={filterItems}
                selectedCodes={selectedCodes}
                onChange={updateContractorSelection}
              />
            )}
          </Stack>
        }
      />

      {tooLong ? (
        <Alert severity="warning" sx={{ mb: 2 }}>
          เลือกได้ไม่เกิน {MAX_DAYS} วันต่อครั้ง (ตอนนี้ {span} วัน) — ปรับวันที่ให้สั้นลง
        </Alert>
      ) : null}
      {error ? (
        <QueryError error={error} onRetry={() => void summary.refetch()} />
      ) : null}

      {/* Active Filter Bar (shown when filtering is applied) */}
      {isFiltered && (
        <FilterBanner ed={ed} />
      )}

      {/* Empty Selection State */}
      {isNoneSelected && (
        <Alert
          severity="info"
          action={
            <Button color="inherit" onClick={selectAllContractors}>
              Select all
            </Button>
          }
          sx={{ mb: 2 }}
        >
          คุณไม่ได้เลือกผู้รับเหมาใดๆ — กรุณาเลือกผู้รับเหมาอย่างน้อย 1 เจ้าเพื่อดูการวิเคราะห์กำลังคน
        </Alert>
      )}

      {tooLong ? null : !data ? (
        <Stack spacing={2}>
          <BlockSkeleton height={40} />
          <BlockSkeleton height={340} />
        </Stack>
      ) : (
        <Stack spacing={wide ? 1.5 : 2.5}>
          {summary.isFetching ? <LinearProgress sx={{ position: "fixed", top: 64, left: 0, right: 0, zIndex: 10 }} /> : null}

          <Stack direction="row" flexWrap="wrap" useFlexGap columnGap={3} rowGap={0.5}>
            <Figure label="Man-days" value={formatNumber(totals.manDays)} />
            <Figure label="NMH (ชม.)" value={formatNumber(totals.manHours)} />
            <Figure label="เฉลี่ยคน/วัน" value={formatNumber(totals.avgDaily)} />
            <Figure
              label="ผู้รับเหมาที่วิเคราะห์"
              value={isFiltered ? `${totals.count}/${allCodes.length}` : totals.count}
            />
          </Stack>
          {estimated.length > 0 ? (
            <Typography variant="caption" color="text.secondary">
              * NMH บางวันเป็นค่าประมาณ — ส่งแต่รายงานบ่าย จึงคิดชั่วโมงปกติ 8 ชม./คน:{" "}
              {estimated.map((c) => `${c.contractorCode} ${c.estimatedDays} วัน`).join(", ")}
            </Typography>
          ) : null}

          <ManpowerCharts ed={ed} />
        </Stack>
      )}
    </Box>
  );
}

import { type ReactNode } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { CHART_OTHER } from "@/app/theme/chart-palette.js";
import { formatNumber } from "@/lib/format.js";
import { shortDate } from "@/lib/dates.js";
import { ManDayByContractorChart, ManpowerByBuildingChart, NationalityByContractorChart, PositionByContractorChart } from "@/features/report-summaries/index.js";
import type { UseManpowerPageState } from "../hooks/use-manpower-page.js";

// Report view: the four charts one under another, each with the numbers a presenter has to say out loud —
// the total, and every company with its name, people (man-days), hours (NMH) and share — so a screenshot of one
// card is complete. Every table ends with the same two columns, so all four cards add up to the same totals.

interface CompanyRow {
  code: string;
  values: number[];
}

// Same row height the fixed-height charts use for one bar (see weekly-charts), so a report chart never scrolls.
const BAR_ROW = 22;

function CompanyTable({ rows, headers, shareCol, colors, names }: { rows: CompanyRow[]; headers: string[]; shareCol: number; colors: Map<string, string>; names: Map<string, string> }) {
  const sorted = [...rows].filter((r) => (r.values[shareCol] ?? 0) > 0).sort((a, b) => (b.values[shareCol] ?? 0) - (a.values[shareCol] ?? 0));
  const total = sorted.reduce((s, r) => s + (r.values[shareCol] ?? 0), 0);
  const cell = { fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" } as const;
  return (
    <Table size="small" aria-label="ตัวเลขแยกตามบริษัท" sx={{ "& td, & th": { py: 0.5 } }}>
      <TableHead>
        <TableRow>
          <TableCell>บริษัท</TableCell>
          {headers.map((h) => (
            <TableCell key={h} align="right" sx={cell}>{h}</TableCell>
          ))}
          <TableCell align="right" sx={cell}>สัดส่วน</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {sorted.map((r) => (
          <TableRow key={r.code}>
            <TableCell>
              <Stack direction="row" spacing={1} alignItems="center">
                <Box sx={{ width: 12, height: 12, borderRadius: "2px", flexShrink: 0, bgcolor: colors.get(r.code) ?? CHART_OTHER }} />
                <Typography variant="body2" component="span" sx={{ fontWeight: 700 }}>{r.code}</Typography>
                <Typography variant="body2" component="span" color="text.secondary" noWrap>{names.get(r.code) ?? ""}</Typography>
              </Stack>
            </TableCell>
            {r.values.map((v, i) => (
              <TableCell key={headers[i]} align="right" sx={{ ...cell, fontWeight: i === shareCol ? 700 : 400 }}>{formatNumber(v)}</TableCell>
            ))}
            <TableCell align="right" sx={cell}>{total ? `${Math.round(((r.values[shareCol] ?? 0) / total) * 100)}%` : "—"}</TableCell>
          </TableRow>
        ))}
        <TableRow sx={{ "& td": { fontWeight: 700, borderTop: 1, borderColor: "divider" } }}>
          <TableCell>รวม {sorted.length} บริษัท</TableCell>
          {headers.map((h, i) => (
            <TableCell key={h} align="right" sx={cell}>{formatNumber(sorted.reduce((s, r) => s + (r.values[i] ?? 0), 0))}</TableCell>
          ))}
          <TableCell align="right" sx={cell}>100%</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}

function ReportCard({ title, caption, manDays, manHours, children }: { title: string; caption: string; manDays: number; manHours: number; children: ReactNode }) {
  return (
    <Box sx={{ border: 1, borderColor: "divider", borderRadius: 1, bgcolor: "background.paper", p: { xs: 1.5, md: 2.5 }, breakInside: "avoid" }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2} sx={{ mb: 1.5 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h5">{title}</Typography>
          <Typography variant="body2" color="text.secondary">{caption}</Typography>
        </Box>
        <Stack direction="row" spacing={2.5} sx={{ flexShrink: 0, textAlign: "right" }}>
          <Box>
            <Typography variant="h4" component="div" sx={{ fontVariantNumeric: "tabular-nums", lineHeight: 1.1 }}>{formatNumber(manDays)}</Typography>
            <Typography variant="body2" color="text.secondary">Man-days (คน-วัน)</Typography>
          </Box>
          <Box>
            <Typography variant="h4" component="div" sx={{ fontVariantNumeric: "tabular-nums", lineHeight: 1.1 }}>{formatNumber(manHours)}</Typography>
            <Typography variant="body2" color="text.secondary">NMH (ชม.)</Typography>
          </Box>
        </Stack>
      </Stack>
      {children}
    </Box>
  );
}

export function ManpowerReportView({ ed }: { ed: UseManpowerPageState }) {
  const { from, to, days, colors, contractorNameMap, selectedCodes, allCodes, isFiltered, filteredContractors, filteredDaily, filteredByBuilding, filteredPositions, totals } = ed;
  const range = from === to ? shortDate(from) : `${shortDate(from)} – ${shortDate(to)}`;
  const who = isFiltered ? `${selectedCodes.size}/${allCodes.length} บริษัทที่เลือก` : `ทุกบริษัท (${allCodes.length})`;
  const caption = `${range} · ${who}`;

  // Per company: the day-by-day man-days and the NMH (hours) every table ends with, so every card adds up to the same totals.
  const company = new Map(filteredContractors.map((c) => [c.contractorCode, { manDays: c.manDays, manHours: c.manHours }]));
  const codes = [...company.keys()];
  const tail = (code: string) => [company.get(code)?.manDays ?? 0, company.get(code)?.manHours ?? 0];
  const tailHeaders = ["Man-days (คน-วัน)", "NMH (ชม.)"];

  // Building chart: company people over every building row (route sections and Other included).
  const buildingTotals = new Map<string, number>();
  for (const b of filteredByBuilding) for (const [code, n] of Object.entries(b.contractors)) buildingTotals.set(code, (buildingTotals.get(code) ?? 0) + n);
  const buildingBars = filteredByBuilding.filter((b) => Object.values(b.contractors).some((n) => n > 0)).length;

  // Position chart: people per company over every position.
  const positionTotals = new Map<string, number>();
  for (const r of filteredPositions) positionTotals.set(r.contractorCode, (positionTotals.get(r.contractorCode) ?? 0) + (r.totalHeadcount ?? r.avgPerDay ?? 0));
  const positionBars = new Set(filteredPositions.filter((r) => (r.totalHeadcount ?? r.avgPerDay ?? 0) > 0).map((r) => r.position)).size;

  const header = { manDays: totals.manDays, manHours: totals.manHours };
  return (
    <Stack spacing={2.5} sx={{ maxWidth: 1100, mx: "auto", width: "100%" }}>
      <Box>
        <Typography variant="h4">รายงานกำลังคน (Manpower)</Typography>
        <Typography variant="body1" color="text.secondary">{caption}</Typography>
        <Typography variant="caption" color="text.secondary">Man-days = จำนวนคนต่อวัน (เลขที่มากกว่าระหว่างเช้ากับบ่าย) รวมทุกวัน · NMH = Man-days × ชั่วโมงทำงาน + OT คน-ชม.</Typography>
      </Box>

      <ReportCard title="Man-day รายวัน แยกตามผู้รับเหมา" caption={`${caption} · จำนวนคนต่อวัน`} {...header}>
        <ManDayByContractorChart days={days} daily={filteredDaily} colors={colors} height={400} legend={false} />
        <CompanyTable rows={codes.map((code) => ({ code, values: tail(code) }))} headers={tailHeaders} shareCol={0} colors={colors} names={contractorNameMap} />
      </ReportCard>

      <ReportCard title="สัญชาติ / เพศ แยกตามผู้รับเหมา" caption={`${caption} · คน-วัน รวมในช่วงที่เลือก`} {...header}>
        <NationalityByContractorChart contractors={filteredContractors} height={360} />
        <CompanyTable
          rows={filteredContractors.map((c) => ({ code: c.contractorCode, values: [c.thaiMale, c.thaiFemale, c.foreignMale, c.foreignFemale, ...tail(c.contractorCode)] }))}
          headers={["ไทย ชาย", "ไทย หญิง", "ต่างชาติ ชาย", "ต่างชาติ หญิง", ...tailHeaders]}
          shareCol={4}
          colors={colors}
          names={contractorNameMap}
        />
      </ReportCard>

      <ReportCard title="จำนวนคนแยกตามอาคาร" caption={`${caption} · ตามรายงานประจำวัน`} {...header}>
        <ManpowerByBuildingChart rows={filteredByBuilding} colors={colors} height={buildingBars * BAR_ROW + 12 + 28 + 4} />
        <CompanyTable
          rows={codes.map((code) => ({ code, values: [buildingTotals.get(code) ?? 0, ...tail(code)] }))}
          headers={["คน (ตามอาคาร)", ...tailHeaders]}
          shareCol={1}
          colors={colors}
          names={contractorNameMap}
        />
      </ReportCard>

      <ReportCard title="จำนวนคนตามตำแหน่ง แยกตามผู้รับเหมา" caption={`${caption} · จำนวนคนรวมตามตำแหน่ง`} {...header}>
        <PositionByContractorChart rows={filteredPositions} colors={colors} height={positionBars * BAR_ROW + 12 + 36 + 28 + 8} />
        <CompanyTable
          rows={codes.map((code) => ({ code, values: [positionTotals.get(code) ?? 0, ...tail(code)] }))}
          headers={["คน (ตามตำแหน่ง)", ...tailHeaders]}
          shareCol={1}
          colors={colors}
          names={contractorNameMap}
        />
      </ReportCard>
    </Stack>
  );
}

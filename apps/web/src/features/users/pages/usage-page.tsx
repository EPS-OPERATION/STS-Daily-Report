import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { BarChart } from "@mui/x-charts";
import dayjs from "dayjs";
import { CHART_PRIMARY } from "@/app/theme/chart-palette.js";
import { EmptySection } from "@/components/ui/empty-state.js";
import { KpiCard } from "@/components/ui/kpi-card.js";
import { PageHeader } from "@/components/ui/page-header.js";
import { Panel } from "@/components/ui/panel.js";
import { QueryError } from "@/components/ui/query-error.js";
import { BlockSkeleton } from "@/components/ui/skeletons.js";
import { TableCard } from "@/components/ui/table-card.js";
import { addDaysIso, todayIso } from "@/lib/dates.js";
import { formatNumber } from "@/lib/format.js";
import { useUserActivity } from "../hooks/use-users.js";
import { ROLE_LABEL } from "../utils/role-label.js";

const RANGES = [7, 30, 90] as const;
// Phones keep user · days · last seen; role/company move under the name.
const WIDE_ONLY = { display: { xs: "none", md: "table-cell" } } as const;

// Test accounts can be linked to every company: show three codes and a count.
function companyLabel(company: string | null) {
  if (!company) return "—";
  const codes = company.split(", ");
  return codes.length > 3 ? `${codes.slice(0, 3).join(", ")} +${codes.length - 3}` : company;
}

// "~2 ชม. 15 นาที"; 0 = days recovered from older data, minutes unknown.
function minutesLabel(m: number) {
  if (m <= 0) return "—";
  const h = Math.floor(m / 60);
  return h ? `~${h} ชม. ${m % 60} นาที` : `~${m} นาที`;
}

// Admin Usage: how often the app is really used (days with activity per person, Thai calendar days),
// to judge whether the project is worth keeping.
export function UsagePage() {
  const [range, setRange] = useState<(typeof RANGES)[number]>(30);
  const to = todayIso();
  const from = addDaysIso(to, -(range - 1));
  const query = useUserActivity(from, to);
  const data = query.data?.data;

  const days = Array.from({ length: range }, (_, i) => addDaysIso(from, i));
  const perDay = new Map((data?.daily ?? []).map((d) => [d.day, d.users]));
  const series = days.map((d) => perDay.get(d) ?? 0);
  const usedDays = series.filter((n) => n > 0).length;
  const people = data?.users ?? [];
  const activePeople = people.filter((p) => p.activeDays > 0).length;
  const accounts = people.filter((p) => p.status === "active").length;
  const reports = people.reduce((s, p) => s + p.reportsSubmitted, 0);
  const avgPerDay = series.reduce((a, b) => a + b, 0) / range;

  return (
    <Box>
      <PageHeader
        title="การใช้งาน (Usage)"
        subtitle="ใครเข้าใช้แอปบ่อยแค่ไหน — นับเป็นวัน (เวลาไทย) ที่แต่ละคนเปิดใช้งาน"
        actions={
          <Stack direction="row" spacing={1}>
            {RANGES.map((r) => (
              <Button key={r} variant={range === r ? "contained" : "outlined"} disableElevation onClick={() => setRange(r)}>
                {r} วันล่าสุด
              </Button>
            ))}
          </Stack>
        }
      />
      {query.isError ? <QueryError error={query.error} onRetry={() => void query.refetch()} /> : null}
      {!data ? (
        <Stack spacing={2}>
          <BlockSkeleton height={96} />
          <BlockSkeleton height={280} />
        </Stack>
      ) : (
        <Stack spacing={2.5}>
          {query.isFetching ? <LinearProgress sx={{ position: "fixed", top: 64, left: 0, right: 0, zIndex: 10 }} /> : null}
          <Grid container spacing={2}>
            <Grid size={{ xs: 6, md: 3 }}>
              <KpiCard label="วันที่มีคนใช้" value={`${usedDays}`} unit={`/ ${range} วัน`} sub={`${Math.round((usedDays / range) * 100)}% ของช่วงนี้`} subTone="muted" />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <KpiCard label="คนใช้เฉลี่ยต่อวัน" value={avgPerDay.toFixed(1)} unit="คน" sub="รวมวันที่ไม่มีคนใช้" subTone="muted" />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <KpiCard label="ผู้ใช้ที่เข้าใช้" value={`${activePeople}`} unit={`/ ${accounts} บัญชี`} sub="เข้าอย่างน้อย 1 วันในช่วงนี้" subTone="muted" />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <KpiCard label="รายงานที่ส่ง" value={formatNumber(reports)} unit="ครั้ง" sub="เช้า + บ่าย รวมทุกคน" subTone="muted" />
            </Grid>
          </Grid>

          <Panel title="จำนวนคนที่เข้าใช้ต่อวัน" subtitle={`${dayjs(from).format("D MMM")} – ${dayjs(to).format("D MMM YYYY")}`}>
            {usedDays === 0 ? (
              <EmptySection title="ยังไม่มีใครเข้าใช้ในช่วงนี้" height={240} />
            ) : (
              <BarChart
                height={260}
                borderRadius={3}
                hideLegend
                xAxis={[{
                  scaleType: "band",
                  data: days,
                  categoryGapRatio: range <= 7 ? 0.4 : 0.2,
                  valueFormatter: (d: string, ctx) => (ctx.location === "tooltip" ? dayjs(d).format("ddd D MMM YYYY") : dayjs(d).format("D/M")),
                  tickLabelInterval: (_: string, i: number) => i % Math.ceil(range / 15) === 0,
                }]}
                yAxis={[{ width: 36, min: 0, tickMinStep: 1 }]}
                series={[{ data: series, color: CHART_PRIMARY, label: "คน", valueFormatter: (v: number | null) => `${v ?? 0} คน` }]}
                grid={{ horizontal: true }}
              />
            )}
          </Panel>

          <TableCard title="รายคน">
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>ผู้ใช้</TableCell>
                    <TableCell sx={WIDE_ONLY}>บทบาท</TableCell>
                    <TableCell sx={WIDE_ONLY}>บริษัท</TableCell>
                    <TableCell align="right">วันที่เข้าใช้</TableCell>
                    <TableCell align="right" sx={WIDE_ONLY}>เวลาใช้งาน</TableCell>
                    <TableCell align="right" sx={WIDE_ONLY}>รายงานที่ส่ง</TableCell>
                    <TableCell>เข้าใช้ล่าสุด</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {people.map((p) => (
                    <TableRow key={p.id} sx={{ opacity: p.activeDays ? 1 : 0.6 }}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{p.displayName ?? p.username ?? p.email}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>{p.username ?? p.email}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: { xs: "block", md: "none" } }}>
                          {ROLE_LABEL[p.role] ?? p.role}{p.company ? ` · ${companyLabel(p.company)}` : ""}
                        </Typography>
                      </TableCell>
                      <TableCell sx={WIDE_ONLY}>{ROLE_LABEL[p.role] ?? p.role}</TableCell>
                      <TableCell sx={WIDE_ONLY} title={p.company ?? undefined}>{companyLabel(p.company)}</TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end">
                          <Box sx={{ display: { xs: "none", sm: "block" }, width: 60, height: 6, borderRadius: 3, bgcolor: "action.hover", overflow: "hidden" }}>
                            <Box sx={{ width: `${(p.activeDays / range) * 100}%`, height: "100%", bgcolor: "primary.main" }} />
                          </Box>
                          <Typography variant="body2" sx={{ minWidth: 44, fontVariantNumeric: "tabular-nums" }}>{p.activeDays}/{range}</Typography>
                        </Stack>
                      </TableCell>
                      <TableCell align="right" sx={WIDE_ONLY}>{minutesLabel(p.activeMinutes)}</TableCell>
                      <TableCell align="right" sx={WIDE_ONLY}>{p.reportsSubmitted || "—"}</TableCell>
                      <TableCell>{p.lastSeenAt ? dayjs(p.lastSeenAt).format("D MMM YY HH:mm") : "ไม่เคยเข้า"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </TableCard>
          <Typography variant="caption" color="text.secondary">
            เวลาใช้งาน = นาทีที่มีการใช้งานโดยประมาณ (นับทีละนาทีขณะเปิดแอป) · «—» = วันที่กู้จากข้อมูลเดิม (เข้าสู่ระบบ/ส่งรายงาน) ก่อนเริ่มเก็บ log จึงไม่มีนาที
          </Typography>
        </Stack>
      )}
    </Box>
  );
}

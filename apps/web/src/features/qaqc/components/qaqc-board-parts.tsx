import { PieChart } from "@mui/x-charts/PieChart";
import type { ReactNode } from "react";
import { EmptySection } from "@/components/ui/empty-state.js";
import { BlockSkeleton } from "@/components/ui/skeletons.js";
import { ContractorBadge } from "@/features/contractors/index.js";
import { formatThaiDate } from "@/lib/dates.js";
import { inspectionTypeLabel } from "./request-section.js";
import { type InspectionRequest } from "../types/inspection-request.types.js";
import DonutLargeOutlinedIcon from "@mui/icons-material/DonutLargeOutlined";
import EventAvailableOutlinedIcon from "@mui/icons-material/EventAvailableOutlined";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

export const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const MAX_DAYS = 62;

export type Share = { code: string; name: string; count: number; color: string };

export function tally(
  rows: InspectionRequest[],
  key: (r: InspectionRequest) => string,
  name: (r: InspectionRequest) => string,
): Array<{ code: string; name: string; count: number }> {
  const map = new Map<string, { code: string; name: string; count: number }>();
  for (const r of rows) {
    const code = key(r);
    const entry = map.get(code) ?? { code, name: name(r), count: 0 };
    entry.count += 1;
    map.set(code, entry);
  }
  return [...map.values()].sort((a, b) => b.count - a.count || a.code.localeCompare(b.code));
}

/** One day of the inspection schedule as a time-ordered list. */
export function ScheduleColumn({
  title,
  date,
  rows,
  loading,
  empty,
}: {
  title: string;
  date: string;
  rows: InspectionRequest[];
  loading: boolean;
  empty: string;
}) {
  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ px: 2.5, pt: 2, pb: 1.5 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          {title}{" "}
          <Box component="span" sx={{ color: "text.secondary", fontWeight: 400 }}>
            ({rows.length})
          </Box>
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {formatThaiDate(date)}
        </Typography>
      </Stack>
      <Divider />
      {loading ? (
        <Stack spacing={1} sx={{ p: 2.5 }}>
          <BlockSkeleton height={48} />
          <BlockSkeleton height={48} />
        </Stack>
      ) : rows.length === 0 ? (
        <Box sx={{ p: 2 }}>
          <EmptySection dense icon={<EventAvailableOutlinedIcon />} title={empty} />
        </Box>
      ) : (
        <Stack divider={<Divider />}>
          {rows.map((r) => (
            <Stack key={r.id} direction="row" spacing={2} alignItems="flex-start" sx={{ px: 2.5, py: 1.5 }}>
              <Typography
                variant="body2"
                sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums", width: 44, flexShrink: 0, pt: 0.25 }}
              >
                {r.inspectionTime}
              </Typography>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.25 }}>
                  <ContractorBadge code={r.contractorCode} title={r.contractorName} />
                  <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                    {r.inspectionType && r.inspectionType !== "other"
                      ? `${inspectionTypeLabel(r.inspectionType)} · ${r.workItem}`
                      : r.workItem}
                  </Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: "anywhere" }}>
                  {[`${r.buildingCode}${r.location ? ` · ${r.location}` : ""}`, r.drawingRef]
                    .filter(Boolean)
                    .join(" — ")}
                </Typography>
              </Box>
            </Stack>
          ))}
        </Stack>
      )}
    </Box>
  );
}

/** Donut of the share with a legend listing count and percent per slice. */
export function ShareCard({
  title,
  centerLabel,
  shares,
  total,
  loading,
  renderLabel,
}: {
  title: string;
  centerLabel: string;
  shares: Share[];
  total: number;
  loading: boolean;
  renderLabel: (s: Share) => ReactNode;
}) {
  return (
    <Card variant="outlined" sx={{ height: "100%" }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 700, px: 2.5, pt: 2, pb: 1.5 }}>
        {title}
      </Typography>
      <Divider />
      {loading ? (
        <Box sx={{ p: 2.5 }}>
          <BlockSkeleton height={200} />
        </Box>
      ) : shares.length === 0 ? (
        <Box sx={{ p: 2 }}>
          <EmptySection icon={<DonutLargeOutlinedIcon />} title="ไม่มีคำขอตรวจในช่วงวันที่เลือก" description="เลือกช่วงวันที่อื่น หรือรอผู้รับเหมาส่งคำขอ" />
        </Box>
      ) : (
        <Stack direction={{ xs: "column", sm: "row" }} spacing={3} alignItems="center" sx={{ px: 2.5, py: 2 }}>
          <Box sx={{ position: "relative", width: 200, height: 200, flexShrink: 0 }}>
            <PieChart
              series={[
                {
                  data: shares.map((s, i) => ({ id: i, value: s.count, label: s.code, color: s.color })),
                  innerRadius: 62,
                  outerRadius: 92,
                  paddingAngle: 1.5,
                  cornerRadius: 3,
                },
              ]}
              width={200}
              height={200}
              hideLegend
              margin={{ top: 0, bottom: 0, left: 0, right: 0 }}
            />
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: "none",
              }}
            >
              <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.1, fontVariantNumeric: "tabular-nums" }}>
                {total}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {centerLabel}
              </Typography>
            </Box>
          </Box>
          <Stack spacing={1} sx={{ flex: 1, minWidth: 0, width: "100%", maxHeight: 200, overflowY: "auto" }}>
            {shares.map((s) => (
              <Stack key={s.code} direction="row" alignItems="center" spacing={1.25}>
                <Box sx={{ width: 10, height: 10, borderRadius: 0.5, bgcolor: s.color, flexShrink: 0 }} />
                <Box sx={{ flex: 1, minWidth: 0 }}>{renderLabel(s)}</Box>
                <Typography variant="body2" sx={{ fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>
                  <Box component="span" sx={{ fontWeight: 700 }}>
                    {s.count}
                  </Box>{" "}
                  <Box component="span" sx={{ color: "text.secondary" }}>
                    · {total > 0 ? Math.round((s.count / total) * 100) : 0}%
                  </Box>
                </Typography>
              </Stack>
            ))}
          </Stack>
        </Stack>
      )}
    </Card>
  );
}

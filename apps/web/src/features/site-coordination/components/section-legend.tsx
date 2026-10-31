import type { CoordinationSection, CoordinationSectionActivity, CoordinationSectionPlan, CoordinationSectionWork } from "@sts/shared";
import AssignmentOutlined from "@mui/icons-material/AssignmentOutlined";
import ExpandLessOutlined from "@mui/icons-material/ExpandLessOutlined";
import ExpandMoreOutlined from "@mui/icons-material/ExpandMoreOutlined";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useMemo, useState } from "react";

const EMPTY_WORK = { activities: [] as CoordinationSectionActivity[], planned: [] as CoordinationSectionPlan[] };

// The area's route sections as the table on the drawing (Section | Work), above the job list. Tapping a row
// highlights that stretch on the map and opens what contractors reported for it in today's daily report forms
// (Today Activity / extra work with plan and actual %) and what yesterday's Tomorrow Forecast planned for it.
export function SectionLegend({ sections, jobCounts, work, workLoading = false, highlightId, onHighlight }: {
  sections: CoordinationSection[];
  /** Map jobs of the day linked to each section. */
  jobCounts: Map<string, number>;
  /** Daily-report rows on these sections (undefined while loading or unavailable). */
  work?: CoordinationSectionWork;
  workLoading?: boolean;
  highlightId: string | null;
  onHighlight: (id: string | null) => void;
}) {
  const [open, setOpen] = useState(true);
  const bySection = useMemo(() => {
    const m = new Map<string, typeof EMPTY_WORK>();
    for (const a of work?.activities ?? []) { const v = m.get(a.sectionId) ?? { activities: [], planned: [] }; v.activities.push(a); m.set(a.sectionId, v); }
    for (const p of work?.planned ?? []) { const v = m.get(p.sectionId) ?? { activities: [], planned: [] }; v.planned.push(p); m.set(p.sectionId, v); }
    return m;
  }, [work]);
  if (!sections.length) return null;
  return (
    <Box sx={{ borderBottom: "1px solid", borderColor: "divider", flexShrink: 0 }}>
      <ButtonBase onClick={() => setOpen((v) => !v)} aria-expanded={open} sx={{ width: "100%", justifyContent: "flex-start", px: 1.5, py: 1, gap: 1 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Route sections</Typography>
        <Typography variant="caption" color="text.secondary" sx={{ flex: 1, textAlign: "left" }}>{sections.length} ช่วง · แตะเพื่อดูงานจากรายงาน</Typography>
        {open ? <ExpandLessOutlined fontSize="small" color="action" /> : <ExpandMoreOutlined fontSize="small" color="action" />}
      </ButtonBase>
      {open && <Box sx={{ maxHeight: 320, overflowY: "auto", pb: 0.5 }}>
        {sections.map((s) => {
          const on = highlightId === s.id, jobs = jobCounts.get(s.id) ?? 0;
          const reported = bySection.get(s.id) ?? EMPTY_WORK;
          return (
            <Box key={s.id} sx={{ bgcolor: on ? `${s.color}14` : "transparent" }}>
              <ButtonBase onClick={() => onHighlight(on ? null : s.id)} aria-pressed={on} aria-expanded={on}
                sx={{ width: "100%", justifyContent: "flex-start", textAlign: "left", px: 1.5, py: 0.75, gap: 1.25, alignItems: "flex-start",
                  "&:hover": { bgcolor: `${s.color}14` } }}>
                <Box sx={{ width: 22, height: 6, borderRadius: 3, bgcolor: s.color, mt: 0.9, flexShrink: 0 }} />
                <Stack sx={{ minWidth: 0, flex: 1 }}>
                  <Stack direction="row" spacing={0.75} alignItems="baseline" flexWrap="wrap" useFlexGap>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{s.code}</Typography>
                    {reported.activities.length ? <Typography variant="caption" color="primary" sx={{ fontWeight: 600 }}>{reported.activities.length} รายงาน</Typography> : null}
                    {reported.planned.length ? <Typography variant="caption" color="text.secondary">แผน {reported.planned.length}</Typography> : null}
                    {jobs ? <Typography variant="caption" color="text.secondary">{jobs} งานบนผัง</Typography> : null}
                  </Stack>
                  <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: "pre-line" }}>{s.work}</Typography>
                </Stack>
                {on ? <ExpandLessOutlined fontSize="small" color="action" /> : <ExpandMoreOutlined fontSize="small" color="action" />}
              </ButtonBase>
              {on && <SectionReports activities={reported.activities} planned={reported.planned} loading={workLoading} color={s.color} />}
            </Box>
          );
        })}
      </Box>}
    </Box>
  );
}

// What the contractors' forms say about one stretch today: one line per report row.
function SectionReports({ activities, planned, loading, color }: { activities: CoordinationSectionActivity[]; planned: CoordinationSectionPlan[]; loading: boolean; color: string }) {
  if (loading) return <Box sx={{ px: 1.5, pb: 1 }}><Skeleton height={40} /></Box>;
  return (
    <Stack spacing={0.75} sx={{ pl: 5.25, pr: 1.5, pb: 1.25 }}>
      <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", display: "flex", alignItems: "center", gap: 0.5 }}>
        <AssignmentOutlined sx={{ fontSize: 14 }} />จากรายงานประจำวันของผู้รับเหมา
      </Typography>
      {!activities.length && !planned.length ? (
        <Typography variant="caption" color="text.secondary">ยังไม่มีผู้รับเหมาลงงานในช่วงนี้วันนี้ (เลือกช่วงนี้ในช่อง อาคาร/พื้นที่ ของฟอร์ม)</Typography>
      ) : null}
      {activities.map((a) => (
        <Box key={a.id} sx={{ borderLeft: "3px solid", borderColor: color, pl: 1 }}>
          <Typography variant="body2"><b>{a.contractorCode}</b> · {a.work}</Typography>
          <Typography variant="caption" color="text.secondary">
            {[
              a.discipline,
              a.headcount !== null ? `${a.headcount} คน` : null,
              a.startTime && a.endTime ? `${a.startTime}–${a.endTime}` : "ทั้งวัน",
              a.planPercent !== null ? `แผน ${a.planPercent}%` : null,
              a.actualPercent !== null ? `ทำได้ ${a.actualPercent}%` : null,
              a.isAdditional ? "งานเพิ่มเติม" : null,
            ].filter(Boolean).join(" · ")}
          </Typography>
        </Box>
      ))}
      {planned.length ? <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", pt: 0.5 }}>แผนที่แจ้งไว้เมื่อวาน (Tomorrow Forecast)</Typography> : null}
      {planned.map((p) => (
        <Box key={p.id} sx={{ borderLeft: "3px dashed", borderColor: color, pl: 1 }}>
          <Typography variant="body2"><b>{p.contractorCode}</b> · {p.work}</Typography>
        </Box>
      ))}
    </Stack>
  );
}

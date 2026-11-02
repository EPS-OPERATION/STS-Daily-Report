import { useState } from "react";
import Box from "@mui/material/Box";
import { PhotoViewer } from "@/components/ui/photo-viewer.js";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { DISCIPLINES } from "@sts/shared";
import { timeWindowLabel } from "@/lib/dates.js";
import { permitLabel } from "@/features/daily-requests/index.js";
import type { UseReviewDialogState } from "../hooks/use-review-dialog.js";
import { crewTotal, crewsOf, plannedWork, stamp } from "../utils/review-view.js";
import { CrewBlock, Field, FieldRow, NotSent, Nothing, ReviewSection, SubHeading } from "./review-parts.js";

const disciplineLabel = (d: string | null) => (d === null ? "ผู้ปฏิบัติงานทั้งหมด" : DISCIPLINES.find((x) => x.code === d)?.label ?? d);

// The morning form (Daily Report) as the contractor filled it, in the form's own section order:
// 1 general · 2 weather · crews with their Today Activity · site equipment · work permits.
export function ReviewMorning({ ed }: { ed: UseReviewDialogState }) {
  const { data, weatherLabel, positionLabel } = ed;
  const [viewing, setViewing] = useState<string | null>(null);
  if (!data) return null;
  if (data.morningStatus !== "submitted") return <NotSent shift="morning" />;
  const crews = crewsOf(data, "morning");
  let n = 2;
  return (
    <Stack spacing={2}>
      <Typography variant="caption" color="text.secondary">
        ส่งเมื่อ {stamp(data.morningSubmittedAt)}
        {data.morningUpdatedAt && data.morningUpdatedAt !== data.morningSubmittedAt ? ` · แก้ไขล่าสุด ${stamp(data.morningUpdatedAt)}` : ""}
      </Typography>

      <ReviewSection index={1} title="ข้อมูลทั่วไป" subtitle="เวลาทำงานและประเภทงานของวัน">
        <FieldRow>
          <Field label="เวลาเริ่ม – เลิกงาน">{data.startTime && data.endTime ? `${data.startTime}–${data.endTime}` : "—"}</Field>
          <Field label="ชั่วโมงทำงานปกติ / คน">{data.workHours !== null ? `${data.workHours} ชม.` : "—"}</Field>
          <Field label="ประเภทงานที่ทำวันนี้">
            {data.disciplines.length ? data.disciplines.map(disciplineLabel).join(" · ") : "—"}
          </Field>
        </FieldRow>
      </ReviewSection>

      <ReviewSection index={2} title="สภาพอากาศ">
        <FieldRow>
          <Field label="สภาพอากาศ">{weatherLabel}</Field>
          <Field label="อุณหภูมิ">{data.temperatureC !== null ? `${data.temperatureC}°C` : "—"}</Field>
          <Field label="ความชื้น">{data.humidityPct !== null ? `${data.humidityPct}%` : "—"}</Field>
        </FieldRow>
      </ReviewSection>

      {crews.length === 0 ? (
        <ReviewSection index={++n} title="ผู้ปฏิบัติงานและ Today Activity"><Nothing>ไม่มีข้อมูลกำลังคน</Nothing></ReviewSection>
      ) : crews.map((crew) => {
        const work = plannedWork(data, crew.discipline);
        return (
          <ReviewSection
            key={crew.discipline ?? "all"}
            index={++n}
            title={`${disciplineLabel(crew.discipline)} — ผู้ปฏิบัติงานและ Today Activity`}
            action={<Chip size="small" color="primary" variant="outlined" label={`${crewTotal(crew)} คน`} sx={{ fontWeight: 700 }} />}
          >
            <Stack spacing={2}>
              <CrewBlock crew={crew} positionLabel={positionLabel} />
              <Box>
                <SubHeading>Today Activity — งานที่ลงอาคาร ({work.length} รายการ)</SubHeading>
                {work.length === 0 ? <Nothing>ไม่ได้ลงงานรายอาคาร</Nothing> : (
                  <TableContainer>
                    <Table size="small" aria-label={`Today Activity ${disciplineLabel(crew.discipline)}`}>
                      <TableHead>
                        <TableRow>
                          <TableCell>อาคาร / พื้นที่</TableCell>
                          <TableCell>งานที่ทำ</TableCell>
                          <TableCell align="right">คน</TableCell>
                          <TableCell>เวลา</TableCell>
                          <TableCell align="right">แผน</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {work.map((a) => (
                          <TableRow key={a.id}>
                            <TableCell sx={{ whiteSpace: "nowrap" }}><b>{a.buildingCode}</b> {a.buildingName}</TableCell>
                            <TableCell>{a.workDescription}</TableCell>
                            <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>{a.headcount}</TableCell>
                            <TableCell sx={{ whiteSpace: "nowrap" }}>{timeWindowLabel(a.startTime, a.endTime)}</TableCell>
                            <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>{a.planPercent === null ? "—" : `${a.planPercent}%`}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>
            </Stack>
          </ReviewSection>
        );
      })}

      <ReviewSection index={++n} title="เครื่องจักรและอุปกรณ์ประจำไซต์" subtitle="ที่อยู่ในไซต์วันนี้">
        {data.equipment.length === 0 ? <Nothing>ไม่มีรายการ</Nothing> : (
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {data.equipment.map((e) => <Chip key={e.equipmentType} variant="outlined" label={`${e.equipmentType} × ${e.qty}`} />)}
          </Stack>
        )}
      </ReviewSection>

      <ReviewSection index={++n} title="ใบอนุญาตงานเสี่ยง (Work Permits)" subtitle="งานเสี่ยงที่ทำวันนี้ (Hot Work, Work at Height, Lifting ฯลฯ)">
        {data.permits.length === 0 ? <Nothing>ไม่มีงานที่ต้องขอใบอนุญาต</Nothing> : (
          <Stack spacing={1}>
            {data.permits.map((p) => (
              <Stack key={p.id} direction="row" spacing={1.5} alignItems="center" justifyContent="space-between" sx={{ px: 1.5, py: 1, bgcolor: "grey.50", borderRadius: 1 }}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {p.permitType === "other" ? p.otherLabel : permitLabel(p.permitType)} · {p.buildingCode}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    ผู้ปฏิบัติงาน {p.workers} คน{p.taskName ? ` · ${p.taskName}` : ""}{p.supervisorName ? ` · ผู้ควบคุม ${p.supervisorName}` : ""}
                  </Typography>
                  {/* Site photos the contractor attached to this job (optional). */}
                  {p.photoKey && data.photos.some((ph) => ph.permitKey === p.photoKey && ph.url) ? (
                    <Stack direction="row" flexWrap="wrap" useFlexGap spacing={0.75} sx={{ mt: 0.75 }}>
                      {data.photos.filter((ph) => ph.permitKey === p.photoKey && ph.url).map((ph) => (
                        <Box key={ph.id} component="button" type="button" aria-label={`ดูรูป ${ph.fileName}`} onClick={() => setViewing(ph.url)} sx={{ p: 0, border: 0, bgcolor: "transparent", cursor: "zoom-in" }}>
                          <Box component="img" src={ph.url ?? undefined} alt={ph.fileName} loading="lazy" sx={{ display: "block", height: 72, width: 96, objectFit: "cover", borderRadius: 1, border: 1, borderColor: "divider" }} />
                        </Box>
                      ))}
                    </Stack>
                  ) : null}
                </Box>
                {p.highRisk ? <Chip size="small" color="warning" label="งานเสี่ยงสูง" sx={{ fontWeight: 600, flexShrink: 0 }} /> : null}
              </Stack>
            ))}
          </Stack>
        )}
      </ReviewSection>
      <PhotoViewer src={viewing} onClose={() => setViewing(null)} />
    </Stack>
  );
}

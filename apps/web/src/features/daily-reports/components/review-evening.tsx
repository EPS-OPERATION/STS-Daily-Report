import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { ACCIDENT_CATEGORIES, DISCIPLINES, READINESS, overtimeTotals } from "@sts/shared";
import dayjs from "dayjs";
import { formatThaiDate, timeWindowLabel } from "@/lib/dates.js";
import { RequestStatusChip, inspectionTypeLabel } from "@/features/qaqc/index.js";
import type { UseReviewDialogState } from "../hooks/use-review-dialog.js";
import type { ReportAllocation } from "../types/daily-report.types.js";
import { additionalWork, crewTotal, crewsOf, plannedWork, stamp } from "../utils/review-view.js";
import { CrewBlock, Field, FieldRow, NotSent, Nothing, ReviewSection, SubHeading } from "./review-parts.js";

const disciplineLabel = (d: string | null) => (d === null ? "ผู้ปฏิบัติงานทั้งหมด" : DISCIPLINES.find((x) => x.code === d)?.label ?? d);

function ProgressRow({ a }: { a: ReportAllocation }) {
  const actual = a.actualPercent ?? 0;
  const behind = a.planPercent !== null && actual < a.planPercent;
  return (
    <Box sx={{ px: 1.5, py: 1.25, border: 1, borderColor: behind ? "warning.main" : "divider", borderRadius: 1 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}><b>{a.buildingCode}</b> {a.buildingName}</Typography>
          <Typography variant="body2">{a.workDescription}</Typography>
          <Typography variant="caption" color="text.secondary">{a.headcount} คน · {timeWindowLabel(a.startTime, a.endTime)}</Typography>
        </Box>
        {a.isAdditional
          ? <Chip size="small" color="info" label="งานเพิ่มเติม" sx={{ fontWeight: 600, flexShrink: 0 }} />
          : a.planPercent === null
            ? <Chip size="small" variant="outlined" label="ไม่ระบุแผน" sx={{ flexShrink: 0 }} />
            : <Chip size="small" color={behind ? "warning" : "success"} label={behind ? "Behind plan" : "On plan"} sx={{ fontWeight: 600, flexShrink: 0 }} />}
      </Stack>
      <Stack direction="row" justifyContent="space-between" sx={{ mt: 1, mb: 0.5 }}>
        <Typography variant="caption" color="text.secondary">ผลงานจริง {a.actualPercent === null ? "—" : `${actual}%`}</Typography>
        <Typography variant="caption" color="text.secondary">แผน {a.planPercent === null ? "—" : `${a.planPercent}%`}</Typography>
      </Stack>
      <LinearProgress variant="determinate" value={Math.min(100, actual)} color={behind ? "warning" : "success"} sx={{ height: 8, borderRadius: 4 }} />
      {a.countermeasure ? (
        <Alert severity="warning" sx={{ mt: 1.25, py: 0 }}>
          <Typography variant="caption" sx={{ fontWeight: 700, display: "block" }}>มาตรการแก้ไข (Countermeasure)</Typography>
          <Typography variant="caption">{a.countermeasure}</Typography>
        </Alert>
      ) : null}
    </Box>
  );
}

// The evening form (Daily Request) as the contractor filled it, in the form's own section order:
// 1 safety · 2 OT · 3 afternoon crew · 4 progress · 5 tomorrow's requests · 6 sign-off.
export function ReviewEvening({ ed }: { ed: UseReviewDialogState }) {
  const { data, positionLabel } = ed;
  if (!data) return null;
  if (data.eveningStatus !== "submitted") return <NotSent shift="evening" />;
  const crews = crewsOf(data, "evening");
  const accidentLabel = ACCIDENT_CATEGORIES.find((c) => c.code === data.accidentCategory)?.labelTh;
  const ot = data.overtime ?? [];
  const otTotals = ot.length ? overtimeTotals(ot) : null;
  const extra = additionalWork(data);
  const legacyRequests = data.machinery.length + data.equipmentRequests.length + data.materials.length;
  const record = data.safetyRecord;
  return (
    <Stack spacing={2}>
      <Typography variant="caption" color="text.secondary">
        ส่งเมื่อ {stamp(data.eveningSubmittedAt)}
        {data.eveningUpdatedAt && data.eveningUpdatedAt !== data.eveningSubmittedAt ? ` · แก้ไขล่าสุด ${stamp(data.eveningUpdatedAt)}` : ""}
      </Typography>

      <ReviewSection index={1} title="ความปลอดภัย">
        {data.accidentOccurred === true ? (
          <Alert severity="error">
            <Typography variant="body2" sx={{ fontWeight: 700 }}>เกิดอุบัติเหตุ / เหตุการณ์ผิดปกติ{accidentLabel ? ` · ${accidentLabel}` : ""}</Typography>
            <Typography variant="body2">{data.accidentNote || "ไม่มีรายละเอียดเพิ่มเติม"}</Typography>
          </Alert>
        ) : data.accidentOccurred === false ? (
          <Alert severity="success"><Typography variant="body2" sx={{ fontWeight: 700 }}>ไม่เกิดอุบัติเหตุในรอบวัน</Typography></Alert>
        ) : (
          <Nothing>รายงานนี้ไม่ได้ระบุข้อมูลอุบัติเหตุ</Nothing>
        )}
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
          สถิติของผู้รับเหมาในโครงการนี้: อุบัติเหตุสะสม {record.accidents} ครั้ง · ปลอดอุบัติเหตุต่อเนื่อง {record.daysSinceLastAccident} วัน
          {record.lastAccidentDate ? ` (ครั้งล่าสุด ${formatThaiDate(record.lastAccidentDate)})` : ""}
        </Typography>
      </ReviewSection>

      <ReviewSection index={2} title="ชั่วโมงทำงานล่วงเวลา (OT)" action={otTotals ? <Chip size="small" variant="outlined" label={`${otTotals.workers} คน · ${otTotals.manHours} คน-ชม.`} sx={{ fontWeight: 700 }} /> : undefined}>
        {ot.length === 0 ? (
          <Nothing>{data.otHours ? `OT ${data.otHours} ชม./คน (ส่งก่อนมีการแยกรายการ)` : "ไม่มี OT"}</Nothing>
        ) : (
          <TableContainer>
            <Table size="small" aria-label="Overtime">
              <TableHead>
                <TableRow><TableCell>อาคาร / พื้นที่</TableCell><TableCell>งาน</TableCell><TableCell align="right">คน</TableCell><TableCell align="right">ชม.</TableCell><TableCell align="right">คน-ชม.</TableCell></TableRow>
              </TableHead>
              <TableBody>
                {ot.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell sx={{ whiteSpace: "nowrap" }}><b>{o.buildingCode}</b> {o.buildingName}</TableCell>
                    <TableCell>{o.task}</TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>{o.workers}</TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>{o.hours}</TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>{o.workers * o.hours}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </ReviewSection>

      <ReviewSection index={3} title="ผู้ปฏิบัติงานช่วงบ่าย (ตามตำแหน่ง)" subtitle="ทีมช่วงบ่ายอาจต่างจากช่วงเช้า">
        {crews.length === 0 ? <Nothing>ไม่มีข้อมูลกำลังคนช่วงบ่าย</Nothing> : (
          <Stack spacing={2.5}>
            {crews.map((crew) => (
              <Box key={crew.discipline ?? "all"}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>{disciplineLabel(crew.discipline)}</Typography>
                  <Chip size="small" color="primary" variant="outlined" label={`${crewTotal(crew)} คน`} sx={{ fontWeight: 700 }} />
                </Stack>
                <CrewBlock crew={crew} positionLabel={positionLabel} />
              </Box>
            ))}
          </Stack>
        )}
      </ReviewSection>

      <ReviewSection index={4} title="ผลงานจริงรายอาคาร (Status % vs Plan %)" subtitle="แผนมาจากรายงานเช้า · ต่ำกว่าแผนต้องมีมาตรการแก้ไข">
        {data.allocations.length === 0 ? <Nothing>ไม่มีงานรายอาคารให้รายงานผล</Nothing> : (
          <Stack spacing={2}>
            {(crews.length ? crews.map((c) => c.discipline) : [null]).map((d) => {
              const rows = plannedWork(data, d);
              return rows.length === 0 ? null : (
                <Box key={d ?? "all"}>
                  <SubHeading>{disciplineLabel(d)}</SubHeading>
                  <Stack spacing={1}>{rows.map((a) => <ProgressRow key={a.id} a={a} />)}</Stack>
                </Box>
              );
            })}
            {extra.length > 0 ? (
              <Box>
                <SubHeading>งานเพิ่มเติม / นอกแผน (เพิ่มในรายงานบ่าย)</SubHeading>
                <Stack spacing={1}>{extra.map((a) => <ProgressRow key={a.id} a={a} />)}</Stack>
              </Box>
            ) : null}
          </Stack>
        )}
      </ReviewSection>

      <ReviewSection index={5} title="คำขอและแผนงานสำหรับวันพรุ่งนี้ (Tomorrow's Requests)" subtitle={`สำหรับ ${formatThaiDate(data.requestsForDate)} — ใช้ในประชุมประสานงาน 17:00`}>
        <Stack spacing={2.5}>
          <Box>
            <SubHeading>แผนงานพรุ่งนี้ (Tomorrow Forecast Activities)</SubHeading>
            {data.forecasts.length === 0 ? <Nothing>ไม่มีรายการ</Nothing> : (
              <Stack spacing={0.75}>
                {data.forecasts.map((f) => (
                  <Typography key={f.id} variant="body2"><b>{f.buildingCode}</b> {f.buildingName} — {f.description}</Typography>
                ))}
              </Stack>
            )}
          </Box>
          <Box>
            <SubHeading>นัดตรวจ (RFI) ที่ยื่นในรายงานนี้</SubHeading>
            {data.inspections.length === 0 ? <Nothing>ไม่มีการนัดตรวจ</Nothing> : (
              <Stack spacing={1}>
                {data.inspections.map((i) => (
                  <Stack key={i.id} direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1} sx={{ px: 1.5, py: 1, bgcolor: "grey.50", borderRadius: 1 }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{inspectionTypeLabel(i.inspectionType)} · {i.workItem}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {i.buildingCode} · {dayjs(i.inspectionDate).format("D MMM")} {i.inspectionTime}{i.location ? ` · ${i.location}` : ""}
                        {` · ${READINESS.find((r) => r.code === i.readiness)?.labelTh ?? i.readiness}`}
                      </Typography>
                    </Box>
                    <Box sx={{ flexShrink: 0 }}><RequestStatusChip status={i.status} result={i.result} /></Box>
                  </Stack>
                ))}
              </Stack>
            )}
          </Box>
          <Box>
            <SubHeading>ขอใช้ / ปิดถนน (Road Usage)</SubHeading>
            {data.roadUsage.length === 0 ? <Nothing>ไม่ขอใช้ถนน</Nothing> : (
              <Stack spacing={1}>
                {data.roadUsage.map((r) => (
                  <Box key={r.id} sx={{ px: 1.5, py: 1, bgcolor: "grey.50", borderRadius: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{r.roadLocation}{r.buildingCode ? ` · ${r.buildingCode}` : ""}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                      {r.startTime}–{r.endTime} · {r.purpose}
                    </Typography>
                    {r.adjusted ? (
                      <Typography variant="caption" color="info.main" sx={{ display: "block" }}>
                        ผู้รับเหมาขอ {r.requestedStartTime}–{r.requestedEndTime} · EPS ปรับเวลา{r.adjustedByName ? ` (${r.adjustedByName})` : ""}
                      </Typography>
                    ) : null}
                  </Box>
                ))}
              </Stack>
            )}
          </Box>
          {legacyRequests > 0 ? (
            <Box>
              <SubHeading>รายการที่ส่งไว้ก่อนหน้า (ฟอร์มปัจจุบันไม่ถามแล้ว)</SubHeading>
              <Stack spacing={0.75}>
                {data.machinery.map((m) => <Typography key={m.id} variant="body2">เครื่องจักร: {m.machineType}{m.unitTag ? ` (${m.unitTag})` : ""} · {m.buildingCode} · {timeWindowLabel(m.startTime, m.endTime)}{m.purpose ? ` · ${m.purpose}` : ""}</Typography>)}
                {data.equipmentRequests.map((e) => <Typography key={e.id} variant="body2">อุปกรณ์: {e.equipmentType} × {e.qty} · {e.buildingCode}{e.purpose ? ` · ${e.purpose}` : ""}</Typography>)}
                {data.materials.map((m) => <Typography key={m.materialName} variant="body2">วัสดุ: {m.materialName} {m.qty} {m.unit}</Typography>)}
              </Stack>
            </Box>
          ) : null}
        </Stack>
      </ReviewSection>

      <ReviewSection index={6} title="ลงนามยืนยัน (Digital Signature)">
        {data.signatureName || data.signatureData ? (
          <FieldRow>
            <Field label="ผู้จัดทำรายงาน">{data.signatureName || "—"}</Field>
            <Field label="ลงนามเมื่อ">{data.signedAt ? dayjs(data.signedAt).format("DD/MM/YYYY HH:mm น.") : "—"}</Field>
            {data.signatureData ? (
              <Box sx={{ border: 1, borderColor: "divider", borderRadius: 1, bgcolor: "common.white", p: 0.5 }}>
                <Box component="img" src={data.signatureData} alt={`ลายเซ็น ${data.signatureName ?? ""}`} sx={{ display: "block", height: 72, maxWidth: 240 }} />
              </Box>
            ) : null}
          </FieldRow>
        ) : <Nothing>ไม่ได้ลงนาม</Nothing>}
      </ReviewSection>

      {data.photos.length > 0 ? (
        <ReviewSection index={7} title="รูปถ่าย" subtitle="ที่แนบไว้ก่อนหน้า (ฟอร์มปัจจุบันไม่มีการอัปโหลดรูปแล้ว)">
          <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1}>
            {data.photos.filter((p) => p.url).map((p) => (
              <Box key={p.id} component="a" href={p.url ?? undefined} target="_blank" rel="noopener">
                <Box component="img" src={p.url ?? undefined} alt={p.fileName} loading="lazy" sx={{ display: "block", height: 96, width: 128, objectFit: "cover", borderRadius: 1, border: 1, borderColor: "divider" }} />
              </Box>
            ))}
          </Stack>
        </ReviewSection>
      ) : null}
    </Stack>
  );
}

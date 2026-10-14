import ApartmentOutlinedIcon from "@mui/icons-material/ApartmentOutlined";
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ConstructionOutlinedIcon from "@mui/icons-material/ConstructionOutlined";
import PrecisionManufacturingOutlinedIcon from "@mui/icons-material/PrecisionManufacturingOutlined";
import RouteOutlinedIcon from "@mui/icons-material/RouteOutlined";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import HealthAndSafetyOutlinedIcon from "@mui/icons-material/HealthAndSafetyOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Grid from "@mui/material/Grid";
import LinearProgress from "@mui/material/LinearProgress";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
import { POSITIONS, WEATHER_CONDITIONS } from "@sts/shared";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { EmptySection } from "@/components/ui/empty-state.js";
import { StatusChip } from "@/components/ui/status-chip.js";
import { QueryError } from "@/components/ui/query-error.js";
import { useCurrentProject } from "@/features/projects/index.js";
import { useCurrentReport } from "../hooks/use-daily-report-queries.js";
import type { DailyReport, ReviewQueueRow } from "../types/daily-report.types.js";
import { formatThaiDate, timeWindowLabel } from "../utils/dates.js";
import { permitLabel } from "./permit-meta.js";

export function ReviewDialog({
  report,
  projectId: propProjectId,
  onClose,
}: {
  report: ReviewQueueRow | null;
  projectId?: string | null;
  onClose: () => void;
}) {
  const { projectId: contextProjectId } = useCurrentProject();
  const projectId = propProjectId ?? contextProjectId;

  const [tab, setTab] = useState(0);

  // Fetch real report from DB if available
  const reportQuery = useCurrentReport(
    projectId,
    report?.reportDate ?? "",
    report?.contractorId,
  );

  const data: DailyReport | null = reportQuery.data?.data.report ?? null;
  const dataLoading = reportQuery.isPending && report !== null;
  const dataError = reportQuery.error instanceof Error ? reportQuery.error : null;

  useEffect(() => {
    if (report) {
      setTab(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report?.id]);


  const weatherLabel = WEATHER_CONDITIONS.find((w) => w.code === data?.weather)?.label ?? data?.weather ?? "ปกติ";
  const positionLabel = (code: string) => POSITIONS.find((p) => p.code === code)?.labelTh ?? POSITIONS.find((p) => p.code === code)?.label ?? code;

  return (
    <Dialog open={report !== null} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ p: 2.5, pb: 1.5, bgcolor: "navy.dark", color: "common.white" }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
          <Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <Chip
                label={report?.contractorCode ?? "CTR"}
                size="small"
                sx={{ bgcolor: "rgba(255,255,255,0.2)", color: "common.white", fontWeight: 700 }}
              />
              <Typography variant="h6" sx={{ color: "common.white", fontWeight: 700 }}>
                {report?.contractorName}
              </Typography>
            </Stack>
            <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.8)", mt: 0.5 }}>
              รายงานประจำวัน · {report ? formatThaiDate(report.reportDate) : ""}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <StatusChip
              status={report?.morningStatus ?? "draft"}
              label={`Daily Report: ${report?.morningStatus === "submitted" ? "Submitted" : "Not submitted"}`}
            />
            <StatusChip
              status={report?.eveningStatus ?? "draft"}
              label={`Daily Request: ${report?.eveningStatus === "submitted" ? "Submitted" : "Not submitted"}`}
            />
          </Stack>
        </Stack>
      </DialogTitle>

      <Box sx={{ borderBottom: 1, borderColor: "divider", bgcolor: "grey.50" }}>
        <Tabs
          value={tab}
          onChange={(_, v: number) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          aria-label="Daily report review tabs"
        >
          <Tab icon={<GroupsOutlinedIcon />} iconPosition="start" label="Manpower & site" />
          <Tab icon={<ConstructionOutlinedIcon />} iconPosition="start" label="Allocation & buildings" />
          <Tab icon={<FactCheckOutlinedIcon />} iconPosition="start" label="Tomorrow's requests" />
          <Tab icon={<HealthAndSafetyOutlinedIcon />} iconPosition="start" label="Safety & signature" />
        </Tabs>
      </Box>

      <DialogContent sx={{ p: 2.5 }}>
        {dataLoading ? (
          <Stack spacing={1.5} aria-busy="true">
            <Skeleton variant="rounded" height={56} />
            <Skeleton variant="rounded" height={160} />
            <Skeleton variant="rounded" height={120} />
          </Stack>
        ) : dataError ? (
          <QueryError error={dataError} onRetry={() => void reportQuery.refetch()} />
        ) : !data ? (
          <Alert severity="info" sx={{ my: 2 }}>
            ยังไม่มีข้อมูลรายงานเช้า/เย็นของรายการนี้ในระบบ — ไม่สามารถตรวจสอบได้จนกว่าผู้รับเหมาจะส่งข้อมูล
          </Alert>
        ) : (
          <Stack spacing={2.5}>
            {/* TAB 0: Manpower & Site Overview */}
            {tab === 0 && (
              <Stack spacing={2}>
                <Grid container spacing={1.5}>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <Card variant="outlined" sx={{ p: 1.5, textAlign: "center", bgcolor: "grey.50" }}>
                      <Typography variant="caption" color="text.secondary">
                        กำลังคนทั้งหมด
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 700, color: "primary.main" }}>
                        {data.totalHeadcount} <Typography component="span" variant="body2">คน</Typography>
                      </Typography>
                    </Card>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <Card variant="outlined" sx={{ p: 1.5, textAlign: "center", bgcolor: "grey.50" }}>
                      <Typography variant="caption" color="text.secondary">
                        เวลาทำงาน / โอที
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        {data.workHours ?? 8} ชม. {data.otHours ? `(OT ${data.otHours} ชม.)` : ""}
                      </Typography>
                    </Card>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <Card variant="outlined" sx={{ p: 1.5, textAlign: "center", bgcolor: "grey.50" }}>
                      <Typography variant="caption" color="text.secondary">
                        ชั่วโมงคนรวม (NMH)
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        {data.manHours.toLocaleString()} ชม.
                      </Typography>
                    </Card>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <Card variant="outlined" sx={{ p: 1.5, textAlign: "center", bgcolor: "grey.50" }}>
                      <Typography variant="caption" color="text.secondary">
                        สภาพอากาศ
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {weatherLabel} {data.temperatureC ? `${data.temperatureC}°C` : ""}
                      </Typography>
                    </Card>
                  </Grid>
                </Grid>

                <Card variant="outlined">
                  <CardContent sx={{ p: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
                      สัดส่วนสัญชาติและเพศ (Demographics)
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Box sx={{ p: 1.5, bgcolor: "grey.50", borderRadius: 1.5 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            สัญชาติไทย: {data.thaiMale + data.thaiFemale} คน
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            ชาย {data.thaiMale} คน · หญิง {data.thaiFemale} คน
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Box sx={{ p: 1.5, bgcolor: "grey.50", borderRadius: 1.5 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            สัญชาติต่างด้าว: {data.foreignMale + data.foreignFemale} คน
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            ชาย {data.foreignMale} คน · หญิง {data.foreignFemale} คน
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>

                <Card variant="outlined">
                  <CardContent sx={{ p: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
                      กำลังคนแยกตามตำแหน่งงาน (Positions)
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      {data.positions.map((p) => (
                        <Chip
                          key={p.position}
                          variant="outlined"
                          label={`${positionLabel(p.position)}: ${p.headcount} คน`}
                          sx={{ fontWeight: 500 }}
                        />
                      ))}
                    </Stack>
                  </CardContent>
                </Card>

                {data.equipment.length > 0 && (
                  <Card variant="outlined">
                    <CardContent sx={{ p: 2 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
                        เครื่องจักรและอุปกรณ์ประจำไซต์วันนี้
                      </Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        {data.equipment.map((e, idx) => (
                          <Chip
                            key={idx}
                            color="info"
                            variant="outlined"
                            icon={<ConstructionOutlinedIcon />}
                            label={`${e.equipmentType} × ${e.qty} คัน/เครื่อง`}
                          />
                        ))}
                      </Stack>
                    </CardContent>
                  </Card>
                )}
              </Stack>
            )}

            {/* TAB 1: Building Allocations & Progress */}
            {tab === 1 && (
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
                            <Chip
                              size="small"
                              color={isBehind ? "warning" : "success"}
                              label={isBehind ? "Behind plan" : "On plan"}
                            />
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
            )}

            {/* TAB 2: Tomorrow's Requests */}
            {tab === 2 && (
              <Stack spacing={2}>
                <Typography variant="subtitle2" color="text.secondary">
                  รายการคำขอสำหรับวันพรุ่งนี้ (ส่งเพื่อเข้าประชุมประสานงานเวลา 17:00 น.)
                </Typography>

                <Card variant="outlined">
                  <CardContent sx={{ p: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                      🚜 ขอจองเครื่องจักรหนัก (Machinery)
                    </Typography>
                    {data.machinery.length === 0 ? (
                      <EmptySection dense icon={<PrecisionManufacturingOutlinedIcon />} title="ไม่มีรายการขอจองเครื่องจักร" />
                    ) : (
                      <Stack spacing={1}>
                        {data.machinery.map((m) => (
                          <Box key={m.id} sx={{ p: 1.5, bgcolor: "grey.50", borderRadius: 1 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {m.machineType} {m.unitTag ? `(${m.unitTag})` : ""} · อาคาร {m.buildingCode}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                              เวลา: {timeWindowLabel(m.startTime, m.endTime)} · วัตถุประสงค์: {m.purpose || "—"}
                            </Typography>
                          </Box>
                        ))}
                      </Stack>
                    )}
                  </CardContent>
                </Card>

                <Card variant="outlined">
                  <CardContent sx={{ p: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                      📋 ขอใบอนุญาตทำงานเสี่ยง (Permit to Work - PTW)
                    </Typography>
                    {data.permits.length === 0 ? (
                      <EmptySection dense icon={<AssignmentOutlinedIcon />} title="ไม่มีการขอใบอนุญาตทำงานเสี่ยง" />
                    ) : (
                      <Stack spacing={1}>
                        {data.permits.map((p) => (
                          <Box key={p.id} sx={{ p: 1.5, bgcolor: "grey.50", borderRadius: 1 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {p.permitType === "other" ? p.otherLabel : permitLabel(p.permitType)} · อาคาร {p.buildingCode}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              จำนวนผู้ปฏิบัติงานภายใต้ใบอนุญาต: {p.workers} คน
                            </Typography>
                          </Box>
                        ))}
                      </Stack>
                    )}
                  </CardContent>
                </Card>

                <Card variant="outlined">
                  <CardContent sx={{ p: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                      🛣️ ขอใช้เส้นทาง / ปิดถนน (Road Usage)
                    </Typography>
                    {data.roadUsage.length === 0 ? (
                      <EmptySection dense icon={<RouteOutlinedIcon />} title="ไม่มีการขอใช้เส้นทางสัญจร" />
                    ) : (
                      <Stack spacing={1}>
                        {data.roadUsage.map((r) => (
                          <Box key={r.id} sx={{ p: 1.5, bgcolor: "grey.50", borderRadius: 1 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {r.roadLocation} · อาคาร {r.buildingCode}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                              เวลา: {r.startTime}–{r.endTime} · วัตถุประสงค์: {r.purpose}
                            </Typography>
                          </Box>
                        ))}
                      </Stack>
                    )}
                  </CardContent>
                </Card>
              </Stack>
            )}

            {/* TAB 3: Safety & Sign-off */}
            {tab === 3 && (
              <Stack spacing={2}>
                <Card variant="outlined">
                  <CardContent sx={{ p: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                      สถิติความปลอดภัยและการเกิดอุบัติเหตุ
                    </Typography>
                    {data.accidentOccurred ? (
                      <Alert severity="error">
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          เกิดอุบัติเหตุหรือเหตุการณ์ผิดปกติ
                        </Typography>
                        <Typography variant="caption">{data.accidentNote || "ไม่มีรายละเอียดเพิ่มเติม"}</Typography>
                      </Alert>
                    ) : (
                      <Alert severity="success" icon={<CheckCircleOutlineIcon />}>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          ปลอดภัย ไม่เกิดอุบัติเหตุในรอบวัน (Zero Accident)
                        </Typography>
                        <Typography variant="caption">การปฏิบัติงานเป็นไปตามมาตรฐานความปลอดภัย</Typography>
                      </Alert>
                    )}
                  </CardContent>
                </Card>

                <Card variant="outlined">
                  <CardContent sx={{ p: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                      การลงนามรับรองรายงาน (Sign-off)
                    </Typography>
                    <Box sx={{ p: 2, bgcolor: "grey.50", borderRadius: 1.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        ผู้จัดทำรายงาน: {data.signatureName || "นายสมศักดิ์ มั่นคง (ผู้จัดการหน้างาน)"}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        สถานะการส่ง: ส่งรายงานครบถ้วน
                        {data.signedAt ? ` · บันทึกเวลา ${dayjs(data.signedAt).format("DD/MM/YYYY HH:mm น.")}` : ""}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Stack>
            )}

          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2.5, pt: 1.5, borderTop: 1, borderColor: "divider" }}>
        <Button onClick={onClose}>Close</Button>
        <Button
          variant="outlined"
          startIcon={<PictureAsPdfOutlinedIcon />}
          disabled={!report?.id}
          onClick={() => report?.id && window.open(`/daily-reports/${report.id}/print`, "_blank", "noopener")}
        >
          Export PDF
        </Button>
      </DialogActions>
    </Dialog>
  );
}

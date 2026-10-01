import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Grid from "@mui/material/Grid";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";
import { BarChart } from "@mui/x-charts/BarChart";
import { PieChart } from "@mui/x-charts/PieChart";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import type { InspectionResult, RequestStatus } from "@sts/shared";
import dayjs from "dayjs";
import { useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/ui/page-header.js";
import { useMe } from "@/features/auth/index.js";
import {
  ContractorBadge,
  RequestStatusChip,
  addDaysIso,
  inspectionTypeLabel,
  mondayOf,
  todayIso,
  useInspectionRequests,
  useTransitionRequest,
  type InspectionRequest,
} from "@/features/daily-reports/index.js";
import { useCurrentProject } from "@/features/projects/index.js";
import { HttpError } from "@/services/http/client.js";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_DAYS = 62;

// Column titles in EPS wording (requirements deck v2).
const COLUMN_TITLE: Record<RequestStatus, string> = {
  draft: "Draft (ยังไม่ส่ง)",
  requested: "Today RFI",
  confirmed: "Today inspected",
  inspected: "Result",
  closed: "Closed",
};

// QAQC RFI board. Objective: collect first-pass RFI yield to rate contractor
// performance. Contractors raise RFIs in the evening report; EPS confirms,
// records pass / not pass (Correct), and closes.
export function QaqcBoardPage() {
  const theme = useTheme();
  const [params, setParams] = useSearchParams();
  const today = todayIso();
  const rawFrom = ISO_DATE.test(params.get("from") ?? "") ? params.get("from")! : today;
  const rawTo = ISO_DATE.test(params.get("to") ?? "") ? params.get("to")! : today;
  const from = rawFrom <= rawTo ? rawFrom : rawTo;
  const to = rawFrom <= rawTo ? rawTo : rawFrom;
  const tooLong = dayjs(to).diff(dayjs(from), "day") + 1 > MAX_DAYS;
  const { projectId } = useCurrentProject();
  const me = useMe();
  const isEps = me.data?.data.user.role === "eps";
  const list = useInspectionRequests(tooLong ? null : projectId, { from, to, by: "inspection" });
  const move = useTransitionRequest();
  const [notPassFor, setNotPassFor] = useState<InspectionRequest | null>(null);

  const setRange = (f: string, t: string) => {
    const p = new URLSearchParams(params);
    p.set("from", f);
    p.set("to", t);
    setParams(p, { replace: true });
  };

  const rows = list.data?.data ?? [];
  const columns: RequestStatus[] = isEps
    ? ["requested", "confirmed", "inspected", "closed"]
    : ["draft", "requested", "confirmed", "inspected", "closed"];
  const tomorrow = addDaysIso(today, 1);
  const actions = rows.filter(
    (r) =>
      (r.status === "requested" || r.status === "confirmed") &&
      (r.inspectionDate === today || r.inspectionDate === tomorrow) &&
      (r.readiness !== "ready" || !r.drawingRef),
  );

  // First-pass RFI yield: share of inspected RFIs that passed, overall and per contractor.
  const inspected = rows.filter((r) => r.result);
  const passed = inspected.filter((r) => r.result === "pass").length;
  const waiting = rows.filter((r) => r.status === "requested" || r.status === "confirmed").length;
  const byContractor = [...new Set(inspected.map((r) => r.contractorCode))]
    .sort((a, b) => a.localeCompare(b))
    .map((code) => {
      const mine = inspected.filter((r) => r.contractorCode === code);
      const ok = mine.filter((r) => r.result === "pass").length;
      return { code, total: mine.length, pass: ok, rate: Math.round((ok / mine.length) * 100) };
    });

  return (
    <Box>
      <PageHeader
        title="QAQC — RFI"
        subtitle={isEps ? "ยืนยันคำขอตรวจ บันทึก pass / not pass แล้วปิดงาน" : "สถานะคำขอตรวจของบริษัทคุณ (EPS QAQC เป็นผู้อัปเดต)"}
        actions={
          <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
            <DatePicker
              label="ตั้งแต่"
              value={dayjs(from)}
              onChange={(v) => v?.isValid() && setRange(v.format("YYYY-MM-DD"), to)}
              format="D MMM YYYY"
              slotProps={{ textField: { size: "small", sx: { width: 160 } } }}
            />
            <DatePicker
              label="ถึง"
              value={dayjs(to)}
              minDate={dayjs(from)}
              onChange={(v) => v?.isValid() && setRange(from, v.format("YYYY-MM-DD"))}
              format="D MMM YYYY"
              slotProps={{ textField: { size: "small", sx: { width: 160 } } }}
            />
            <Button size="small" variant="outlined" onClick={() => setRange(today, today)}>
              วันนี้
            </Button>
            <Button size="small" variant="outlined" onClick={() => setRange(mondayOf(today), addDaysIso(mondayOf(today), 6))}>
              สัปดาห์นี้
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={() => setRange(dayjs(today).startOf("month").format("YYYY-MM-DD"), dayjs(today).endOf("month").format("YYYY-MM-DD"))}
            >
              เดือนนี้
            </Button>
          </Stack>
        }
      />

      {tooLong ? (
        <Alert severity="warning" sx={{ mb: 2 }}>
          เลือกได้ไม่เกิน {MAX_DAYS} วันต่อครั้ง
        </Alert>
      ) : null}
      {move.error instanceof HttpError ? (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => move.reset()}>
          {move.error.message}
        </Alert>
      ) : null}

      {actions.length > 0 ? (
        <Card sx={{ mb: 2, borderLeft: 4, borderLeftColor: "warning.main" }}>
          <CardContent>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <WarningAmberOutlinedIcon color="warning" />
              <Typography variant="h5">Action Required</Typography>
              <Typography variant="caption" color="text.secondary">
                ตรวจวันนี้/พรุ่งนี้ที่หน้างานยังไม่พร้อม หรือยังไม่แนบ drawing
              </Typography>
            </Stack>
            <Stack spacing={0.75}>
              {actions.map((r) => (
                <Stack key={r.id} direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
                  <Typography variant="body2" sx={{ fontWeight: 700, minWidth: 120 }}>
                    {r.inspectionDate === today ? "วันนี้" : "พรุ่งนี้"} {r.inspectionTime}
                  </Typography>
                  <ContractorBadge code={r.contractorCode} />
                  <Typography variant="body2" sx={{ flexGrow: 1 }}>
                    {inspectionTypeLabel(r.inspectionType)} · {r.workItem} · {r.buildingName}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "warning.dark", fontWeight: 600 }}>
                    {[r.readiness !== "ready" ? "หน้างานยังไม่พร้อม" : null, !r.drawingRef ? "ไม่มี drawing" : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          </CardContent>
        </Card>
      ) : null}

      {list.isLoading || me.isLoading ? (
        <Skeleton variant="rounded" height={420} />
      ) : tooLong ? null : (
        <Stack spacing={2.5}>
          {/* RFI quality summary (deck "Quality inspection") — no NCR yet: no data source. */}
          <Grid container spacing={2.5}>
            <Grid size={{ xs: 12, md: 5 }}>
              <Panel title="ผลตรวจ RFI">
                <Stack direction="row" spacing={2} alignItems="center">
                  <Box sx={{ width: 150, height: 150, flexShrink: 0 }}>
                    {inspected.length ? (
                      <PieChart
                        width={150}
                        height={150}
                        hideLegend
                        series={[
                          {
                            innerRadius: 44,
                            outerRadius: 70,
                            paddingAngle: 2,
                            cornerRadius: 3,
                            data: [
                              { id: "pass", value: passed, label: "pass", color: theme.palette.success.main },
                              { id: "fail", value: inspected.length - passed, label: "not pass (Correct)", color: theme.palette.warning.main },
                            ],
                          },
                        ]}
                      />
                    ) : (
                      <Box sx={{ height: "100%", display: "grid", placeItems: "center" }}>
                        <Typography variant="caption" color="text.secondary">
                          ยังไม่มีผลตรวจ
                        </Typography>
                      </Box>
                    )}
                  </Box>
                  <Stack spacing={1}>
                    <Kpi label="ตรวจแล้ว" value={`${inspected.length} รายการ`} />
                    <Kpi label="ผ่านครั้งแรก (first-pass)" value={inspected.length ? `${Math.round((passed / inspected.length) * 100)}%` : "—"} tone="success" />
                    <Kpi label="not pass (Correct)" value={`${inspected.length - passed} รายการ`} tone="warning" />
                    <Kpi label="รอตรวจ" value={`${waiting} รายการ`} />
                  </Stack>
                </Stack>
              </Panel>
            </Grid>
            <Grid size={{ xs: 12, md: 7 }}>
              <Panel title="First-pass RFI yield ต่อผู้รับเหมา">
                {byContractor.length ? (
                  <BarChart
                    height={byContractor.length * 40 + 70}
                    layout="horizontal"
                    borderRadius={3}
                    yAxis={[{ scaleType: "band", data: byContractor.map((c) => c.code), width: 64 }]}
                    xAxis={[{ min: 0, max: 100, label: "% ผ่านครั้งแรก" }]}
                    series={[
                      {
                        id: "yield",
                        label: "First-pass %",
                        color: theme.palette.primary.main,
                        data: byContractor.map((c) => c.rate),
                        valueFormatter: (v, { dataIndex }) => `${v}% (${byContractor[dataIndex]!.pass}/${byContractor[dataIndex]!.total})`,
                      },
                    ]}
                    barLabel={(item) => (item.value ? `${item.value}%` : null)}
                    grid={{ vertical: true }}
                    hideLegend
                  />
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
                    ยังไม่มีผลตรวจในช่วงนี้
                  </Typography>
                )}
              </Panel>
            </Grid>
          </Grid>

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: `repeat(${columns.length}, minmax(0, 1fr))` }, gap: 1.5 }}>
            {columns.map((col) => {
              const items = rows.filter((r) => r.status === col);
              return (
                <Box key={col} sx={{ bgcolor: "grey.100", borderRadius: 2, p: 1.25, minHeight: 200 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1, px: 0.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {COLUMN_TITLE[col]}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {items.length}
                    </Typography>
                  </Stack>
                  <Stack spacing={1}>
                    {items.map((r) => (
                      <RfiCard
                        key={r.id}
                        request={r}
                        canAct={isEps}
                        busy={move.isPending}
                        onMove={(to, result) => move.mutate({ id: r.id, to, result })}
                        onNotPass={() => setNotPassFor(r)}
                      />
                    ))}
                  </Stack>
                </Box>
              );
            })}
          </Box>
        </Stack>
      )}

      {notPassFor ? (
        <NotPassDialog
          request={notPassFor}
          busy={move.isPending}
          onCancel={() => setNotPassFor(null)}
          onSave={(note) =>
            move.mutate({ id: notPassFor.id, to: "inspected", result: "fail", note }, { onSuccess: () => setNotPassFor(null) })
          }
        />
      ) : null}
    </Box>
  );
}

function RfiCard({
  request: r,
  canAct,
  busy,
  onMove,
  onNotPass,
}: {
  request: InspectionRequest;
  canAct: boolean;
  busy: boolean;
  onMove: (to: RequestStatus, result?: InspectionResult) => void;
  onNotPass: () => void;
}) {
  return (
    <Card>
      <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
          <Typography variant="caption" sx={{ fontWeight: 700 }}>
            {dayjs(r.inspectionDate).format("ddd D MMM")} · {r.inspectionTime}
          </Typography>
          <ContractorBadge code={r.contractorCode} title={r.contractorName} />
        </Stack>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          RFI · {inspectionTypeLabel(r.inspectionType)} · {r.workItem}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
          {r.buildingName}
          {r.location ? ` · ${r.location}` : ""}
          {r.drawingRef ? ` · ${r.drawingRef}` : ""}
        </Typography>
        {r.result ? (
          <Box sx={{ mt: 0.75 }}>
            <RequestStatusChip status={r.status} result={r.result} />
          </Box>
        ) : null}
        {r.epsNote ? (
          <Typography variant="caption" sx={{ display: "block", mt: 0.5, color: "warning.dark" }}>
            {r.epsNote}
          </Typography>
        ) : null}
        {canAct ? (
          <Stack direction="row" spacing={0.75} sx={{ mt: 1 }} flexWrap="wrap" useFlexGap>
            {r.status === "requested" ? (
              <Button size="small" disabled={busy} onClick={() => onMove("confirmed")}>
                Confirm
              </Button>
            ) : null}
            {r.status === "confirmed" ? (
              <>
                <Button size="small" color="success" disabled={busy} onClick={() => onMove("inspected", "pass")}>
                  pass
                </Button>
                <Button size="small" color="warning" disabled={busy} onClick={onNotPass}>
                  not pass (Correct)
                </Button>
                <Button size="small" variant="text" disabled={busy} onClick={() => onMove("requested")}>
                  Undo
                </Button>
              </>
            ) : null}
            {r.status === "inspected" ? (
              <Button size="small" variant="outlined" disabled={busy} onClick={() => onMove("closed")}>
                Close
              </Button>
            ) : null}
          </Stack>
        ) : null}
      </CardContent>
    </Card>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Box sx={{ border: 1, borderColor: "divider", borderRadius: 2, bgcolor: "background.paper", p: 2, height: "100%" }}>
      <Typography variant="h5" sx={{ mb: 1 }}>
        {title}
      </Typography>
      {children}
    </Box>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone?: "success" | "warning" }) {
  return (
    <Stack direction="row" spacing={1} alignItems="baseline">
      <Typography variant="h5" component="span" sx={{ color: tone ? `${tone}.dark` : "text.primary", fontVariantNumeric: "tabular-nums" }}>
        {value}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
    </Stack>
  );
}

function NotPassDialog({
  request,
  busy,
  onCancel,
  onSave,
}: {
  request: InspectionRequest;
  busy: boolean;
  onCancel: () => void;
  onSave: (note: string) => void;
}) {
  const [note, setNote] = useState("");
  return (
    <Dialog open onClose={onCancel} fullWidth maxWidth="xs">
      <DialogTitle>not pass (Correct)</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 2 }}>
          {request.contractorCode} · {inspectionTypeLabel(request.inspectionType)} · {request.workItem}
        </Typography>
        <TextField label="สิ่งที่ต้องแก้ไข" value={note} onChange={(e) => setNote(e.target.value)} multiline minRows={2} fullWidth autoFocus />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button variant="text" color="inherit" onClick={onCancel}>
          ยกเลิก
        </Button>
        <Button color="warning" disabled={busy || !note.trim()} onClick={() => onSave(note.trim())}>
          บันทึก not pass
        </Button>
      </DialogActions>
    </Dialog>
  );
}

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Link from "@mui/material/Link";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";
import { useState, type ReactNode } from "react";
import { Link as RouterLink, useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/ui/page-header.js";
import { useMe } from "@/features/auth/index.js";
import {
  ContractorBadge,
  RequestStatusChip,
  inspectionTypeLabel,
  mondayOf,
  timeWindowLabel,
  todayIso,
  useInspectionRequests,
  useTransitionRequest,
  useWeeklySummary,
  type InspectionRequest,
} from "@/features/daily-reports/index.js";
import { useCurrentProject } from "@/features/projects/index.js";
import { HttpError } from "@/services/http/client.js";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// Daily Request: everything contractors asked for on one day (sent the evening
// before) — machines, equipment, road usage and QAQC inspections (RFI).
// EPS records RFI results here: pass / not pass (correct) → first-pass yield.
export function TodayRequestsPage() {
  const [params, setParams] = useSearchParams();
  const date = ISO_DATE.test(params.get("date") ?? "") ? params.get("date")! : todayIso();
  const { projectId } = useCurrentProject();
  const isEps = useMe().data?.data.user.role === "eps";
  const week = useWeeklySummary(projectId, mondayOf(date));
  const rfi = useInspectionRequests(projectId, { from: date, to: date, by: "inspection" });
  const move = useTransitionRequest();
  const [notPass, setNotPass] = useState<InspectionRequest | null>(null);

  const data = week.data?.data;
  const machines = (data?.machinery ?? []).filter((m) => m.targetDate === date);
  const equipment = (data?.equipmentRequests ?? []).filter((e) => e.targetDate === date);
  const roads = (data?.roads ?? []).filter((r) => r.targetDate === date);
  const inspections = (rfi.data?.data ?? []).filter((r) => r.status !== "draft");
  const loadError = [week.error, rfi.error].find((e) => e instanceof HttpError) as HttpError | undefined;

  const setDate = (d: string) => {
    const p = new URLSearchParams(params);
    p.set("date", d);
    setParams(p, { replace: true });
  };

  return (
    <Box>
      <PageHeader
        title="Daily Request"
        subtitle="คำขอประจำวันจากผู้รับเหมา (ส่งในรายงานเย็นของวันก่อน) — เครื่องจักร อุปกรณ์ ถนน และ QAQC"
        actions={
          <DatePicker
            label="วันที่"
            value={dayjs(date)}
            onChange={(v) => v?.isValid() && setDate(v.format("YYYY-MM-DD"))}
            format="D MMM YYYY"
            slotProps={{ textField: { size: "small", sx: { width: 180 } } }}
          />
        }
      />

      {loadError ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          โหลดข้อมูลไม่สำเร็จ: {loadError.message}
        </Alert>
      ) : null}
      {move.error instanceof HttpError ? (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => move.reset()}>
          {move.error.message}
        </Alert>
      ) : null}

      {!data || !rfi.data ? (
        <Stack spacing={2}>
          <Skeleton variant="rounded" height={140} />
          <Skeleton variant="rounded" height={140} />
        </Stack>
      ) : (
        <Stack spacing={3}>
          <Typography variant="body2" color="text.secondary">
            {machines.length} machine · {equipment.length} equipment · {roads.length} road · {inspections.length} RFI
          </Typography>

          <Section title="Machine request">
            <SimpleTable
              empty="ไม่มีการจองเครื่องจักร"
              head={["Machine", "Unit", "Building", "Contractor", "Time", "Purpose"]}
              rows={machines.map((m) => ({
                key: m.id,
                tone: m.conflict === "conflict" ? "error" : m.conflict === "possible" ? "warning" : undefined,
                cells: [
                  <b key="m">{m.machineType}</b>,
                  m.unitTag ?? "—",
                  m.buildingName,
                  <ContractorBadge key="c" code={m.contractorCode} />,
                  timeWindowLabel(m.startTime, m.endTime),
                  m.purpose ?? "—",
                ],
              }))}
            />
            {machines.some((m) => m.conflict) ? (
              <Typography variant="caption" color="error.main">
                แถวสีแดง = เครื่องเดียวกันถูกจองเวลาชนกัน · สีเหลือง = เวลาชนแต่ไม่ได้ระบุหมายเลขเครื่อง
              </Typography>
            ) : null}
          </Section>

          <Section title="Equipment request">
            <SimpleTable
              empty="ไม่มีการขอเครื่องมือ/อุปกรณ์"
              head={["Equipment", "Qty", "Building", "Contractor", "Purpose"]}
              rows={equipment.map((e) => ({
                key: e.id,
                cells: [<b key="e">{e.equipmentType}</b>, e.qty, e.buildingName, <ContractorBadge key="c" code={e.contractorCode} />, e.purpose ?? "—"],
              }))}
            />
          </Section>

          <Section title="Road usage">
            <SimpleTable
              empty="ไม่มีการขอใช้/ปิดถนน"
              head={["Road / lane", "Time", "Contractor", "Next to", "Purpose"]}
              rows={roads.map((r) => ({
                key: r.id,
                tone: r.conflict ? "error" : undefined,
                cells: [
                  <b key="r">{r.roadLocation}</b>,
                  `${r.startTime}–${r.endTime}`,
                  <ContractorBadge key="c" code={r.contractorCode} />,
                  r.buildingName,
                  r.purpose,
                ],
              }))}
            />
          </Section>

          <Section
            title="QAQC inspections"
            action={
              <Link component={RouterLink} to="/qaqc" underline="always" variant="body2">
                Open QAQC board
              </Link>
            }
          >
            <SimpleTable
              empty="ไม่มีคำขอตรวจ"
              head={["Type", "Time", "Contractor", "Work item", "Building", "Status"]}
              rows={inspections.map((r) => ({
                key: r.id,
                cells: [
                  "RFI",
                  r.inspectionTime,
                  <b key="c">{r.contractorName}</b>,
                  `${inspectionTypeLabel(r.inspectionType)} · ${r.workItem}`,
                  r.buildingCode,
                  isEps && r.status === "confirmed" ? (
                    <Stack key="a" direction="row" spacing={0.75}>
                      <Button size="small" color="warning" disabled={move.isPending} onClick={() => setNotPass(r)}>
                        not pass (Correct)
                      </Button>
                      <Button
                        size="small"
                        color="success"
                        disabled={move.isPending}
                        onClick={() => move.mutate({ id: r.id, to: "inspected", result: "pass" })}
                      >
                        pass
                      </Button>
                    </Stack>
                  ) : isEps && r.status === "requested" ? (
                    <Button key="a" size="small" variant="outlined" disabled={move.isPending} onClick={() => move.mutate({ id: r.id, to: "confirmed" })}>
                      Confirm
                    </Button>
                  ) : (
                    <RequestStatusChip key="s" status={r.status} result={r.result} />
                  ),
                ],
              }))}
            />
          </Section>
        </Stack>
      )}

      {notPass ? (
        <NotPassDialog
          request={notPass}
          busy={move.isPending}
          onCancel={() => setNotPass(null)}
          onSave={(note) =>
            move.mutate({ id: notPass.id, to: "inspected", result: "fail", note }, { onSuccess: () => setNotPass(null) })
          }
        />
      ) : null}
    </Box>
  );
}

function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <Box>
      <Stack direction="row" alignItems="baseline" spacing={2} sx={{ mb: 1 }}>
        <Typography variant="h4">{title}</Typography>
        {action}
      </Stack>
      {children}
    </Box>
  );
}

function SimpleTable({
  head,
  rows,
  empty,
}: {
  head: string[];
  rows: { key: string; tone?: "error" | "warning"; cells: ReactNode[] }[];
  empty: string;
}) {
  if (rows.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
        {empty}
      </Typography>
    );
  }
  return (
    <Box sx={{ overflowX: "auto", border: 1, borderColor: "divider", borderRadius: 2, bgcolor: "background.paper" }}>
      <Table size="small" sx={{ minWidth: 640 }}>
        <TableHead>
          <TableRow>
            {head.map((h) => (
              <TableCell key={h} sx={{ color: "text.secondary", bgcolor: "grey.50" }}>
                {h}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.key} sx={{ bgcolor: r.tone === "error" ? "error.light" : r.tone === "warning" ? "warning.light" : undefined }}>
              {r.cells.map((c, i) => (
                <TableCell key={i}>{c}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
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
      <DialogTitle>Not pass (Correct)</DialogTitle>
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

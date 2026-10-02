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
import dayjs from "dayjs";
import { useState, type ReactNode } from "react";
import { Link as RouterLink, useSearchParams } from "react-router-dom";
import { DateRangeFields } from "@/components/ui/date-range-fields.js";
import { PageHeader } from "@/components/ui/page-header.js";
import { useMe } from "@/features/auth/index.js";
import {
  ContractorBadge,
  RequestStatusChip,
  inspectionTypeLabel,
  timeWindowLabel,
  todayIso,
  useInspectionRequests,
  useTransitionRequest,
  useDailyRequests,
  type InspectionRequest,
} from "@/features/daily-reports/index.js";
import { useCurrentProject } from "@/features/projects/index.js";
import { HttpError } from "@/services/http/client.js";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// Daily Request: everything contractors asked for on the selected day or date range
// (sent the evening before) — machines, equipment, road usage and QAQC inspections (RFI).
// EPS records RFI results here: pass / not pass (correct) → first-pass yield.
export function TodayRequestsPage() {
  const [params, setParams] = useSearchParams();
  // Range from the URL; an old ?date= link still works as a one-day range.
  const single = ISO_DATE.test(params.get("date") ?? "") ? params.get("date")! : todayIso();
  const rawFrom = ISO_DATE.test(params.get("from") ?? "") ? params.get("from")! : single;
  const rawTo = ISO_DATE.test(params.get("to") ?? "") ? params.get("to")! : rawFrom;
  const from = rawFrom <= rawTo ? rawFrom : rawTo;
  const to = rawFrom <= rawTo ? rawTo : rawFrom;
  const isRange = from !== to;
  const { projectId } = useCurrentProject();
  const isEps = useMe().data?.data.user.role === "eps";
  const week = useDailyRequests(projectId, from, to);
  const rfi = useInspectionRequests(projectId, { from, to, by: "inspection" });
  const move = useTransitionRequest();
  const [notPass, setNotPass] = useState<InspectionRequest | null>(null);

  const data = week.data?.data;
  const machines = data?.machinery ?? [];
  const equipment = data?.equipmentRequests ?? [];
  const roads = data?.roads ?? [];
  // In a range every row needs its date; one day stays uncluttered.
  const dayCol = (d: string) => (isRange ? [dayjs(d).format("ddd D MMM")] : []);
  const dayHead = isRange ? ["Date"] : [];
  const inspections = (rfi.data?.data ?? []).filter((r) => r.status !== "draft");
  const loadError = [week.error, rfi.error].find((e) => e instanceof HttpError) as HttpError | undefined;

  const setRange = (f: string, t: string) => {
    const p = new URLSearchParams(params);
    p.delete("date");
    p.set("from", f);
    p.set("to", t);
    setParams(p, { replace: true });
  };

  return (
    <Box>
      <PageHeader
        title="Daily Request"
        subtitle="คำขอประจำวันจากผู้รับเหมา (ส่งในรายงานเย็นของวันก่อน) — เครื่องจักร อุปกรณ์ ถนน และ QAQC"
        actions={
          <DateRangeFields from={from} to={to} maxDays={62} onChange={setRange} />
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
              head={[...dayHead, "Machine", "Building", "Contractor", "Time", "วัตถุประสงค์"]}
              rows={machines.map((m) => ({
                key: m.id,
                cells: [
                  ...dayCol(m.targetDate),
                  <b key="m">{m.machineType}</b>,
                  m.buildingName,
                  <ContractorBadge key="c" code={m.contractorCode} />,
                  timeWindowLabel(m.startTime, m.endTime),
                  m.purpose ?? "—",
                ],
              }))}
            />
          </Section>

          <Section title="Equipment request">
            <SimpleTable
              empty="ไม่มีการขอเครื่องมือ/อุปกรณ์"
              head={[...dayHead, "Equipment", "Qty", "Building", "Contractor", "วัตถุประสงค์"]}
              rows={equipment.map((e) => ({
                key: e.id,
                cells: [
                  ...dayCol(e.targetDate),
                  <b key="e">{e.equipmentType}</b>,
                  e.qty,
                  e.buildingName,
                  <ContractorBadge key="c" code={e.contractorCode} />,
                  e.purpose ?? "—",
                ],
              }))}
            />
          </Section>

          <Section title="Road usage">
            <SimpleTable
              empty="ไม่มีการขอใช้/ปิดถนน"
              head={[...dayHead, "Road / lane", "Time", "Contractor", "Next to", "วัตถุประสงค์"]}
              rows={roads.map((r) => ({
                key: r.id,
                cells: [
                  ...dayCol(r.targetDate),
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
              head={[...dayHead, "Type", "Time", "Contractor", "Work item", "Building", "Status"]}
              rows={inspections.map((r) => ({
                key: r.id,
                cells: [
                  ...dayCol(r.inspectionDate),
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

import ChevronLeftOutlinedIcon from "@mui/icons-material/ChevronLeftOutlined";
import ChevronRightOutlinedIcon from "@mui/icons-material/ChevronRightOutlined";
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
import IconButton from "@mui/material/IconButton";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import type { InspectionResult, RequestStatus } from "@sts/shared";
import dayjs from "dayjs";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/ui/page-header.js";
import { useMe } from "@/features/auth/index.js";
import {
  ContractorBadge,
  REQUEST_STATUS_LABEL,
  ReadinessChip,
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

// Daily Request kanban. Contractors raise requests in the field report; EPS
// confirms, records pass/fail and closes them here. Drafts are contractor-private.
export function QaqcBoardPage() {
  const [params, setParams] = useSearchParams();
  const today = todayIso();
  const weekStart = mondayOf(ISO_DATE.test(params.get("week") ?? "") ? params.get("week")! : today);
  const weekEnd = addDaysIso(weekStart, 6);
  const { projectId } = useCurrentProject();
  const me = useMe();
  const isEps = me.data?.data.user.role === "eps";
  const list = useInspectionRequests(projectId, { from: weekStart, to: weekEnd, by: "inspection" });
  const move = useTransitionRequest();
  const [resultFor, setResultFor] = useState<{ request: InspectionRequest; result: InspectionResult } | null>(null);

  const rows = list.data?.data ?? [];
  const columns: RequestStatus[] = isEps
    ? ["requested", "confirmed", "inspected", "closed"]
    : ["draft", "requested", "confirmed", "inspected", "closed"];
  const tomorrow = addDaysIso(today, 1);
  // Deck p.10 "Action Required": upcoming inspections that are not ready or lack a drawing.
  const actions = rows.filter(
    (r) =>
      (r.status === "requested" || r.status === "confirmed") &&
      (r.inspectionDate === today || r.inspectionDate === tomorrow) &&
      (r.readiness !== "ready" || !r.drawingRef),
  );
  const inspected = rows.filter((r) => r.result);
  const passRate = inspected.length ? Math.round((inspected.filter((r) => r.result === "pass").length / inspected.length) * 100) : null;

  const goWeek = (delta: number) => {
    const p = new URLSearchParams(params);
    p.set("week", addDaysIso(weekStart, delta * 7));
    setParams(p, { replace: true });
  };

  return (
    <Box>
      <PageHeader
        title="QAQC — Daily Requests"
        subtitle={
          isEps
            ? "Confirm contractor inspection requests, record pass/fail, close"
            : "Status of your inspection requests (EPS QAQC moves them)"
        }
        actions={
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <IconButton aria-label="Previous week" onClick={() => goWeek(-1)}>
              <ChevronLeftOutlinedIcon />
            </IconButton>
            <Typography variant="body1" sx={{ fontWeight: 600, minWidth: 170, textAlign: "center" }}>
              {dayjs(weekStart).format("D MMM")} – {dayjs(weekEnd).format("D MMM YYYY")}
            </Typography>
            <IconButton aria-label="Next week" onClick={() => goWeek(1)}>
              <ChevronRightOutlinedIcon />
            </IconButton>
          </Stack>
        }
      />

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
                Today / tomorrow inspections not ready or missing a drawing
              </Typography>
            </Stack>
            <Stack spacing={0.75}>
              {actions.map((r) => (
                <Stack key={r.id} direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
                  <Typography variant="body2" sx={{ fontWeight: 700, minWidth: 120 }}>
                    {r.inspectionDate === today ? "Today" : "Tomorrow"} {r.inspectionTime}
                  </Typography>
                  <ContractorBadge code={r.contractorCode} />
                  <Typography variant="body2" sx={{ flexGrow: 1 }}>
                    {inspectionTypeLabel(r.inspectionType)} · {r.workItem} · {r.buildingName}
                  </Typography>
                  {r.readiness !== "ready" ? <ReadinessChip readiness={r.readiness} /> : null}
                  {!r.drawingRef ? (
                    <Typography variant="caption" sx={{ color: "warning.dark", fontWeight: 600 }}>
                      No drawing ref
                    </Typography>
                  ) : null}
                </Stack>
              ))}
            </Stack>
          </CardContent>
        </Card>
      ) : null}

      <Stack direction="row" spacing={3} sx={{ mb: 1.5 }}>
        <Typography variant="body2" color="text.secondary">
          {rows.length} requests this week
        </Typography>
        {passRate !== null ? (
          <Typography variant="body2" color="text.secondary">
            First-pass rate <b>{passRate}%</b> ({inspected.length} inspected)
          </Typography>
        ) : null}
      </Stack>

      {list.isLoading || me.isLoading ? (
        <Skeleton variant="rounded" height={420} />
      ) : (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: `repeat(${columns.length}, minmax(0, 1fr))` }, gap: 1.5 }}>
          {columns.map((col) => {
            const items = rows.filter((r) => r.status === col);
            return (
              <Box key={col} sx={{ bgcolor: "grey.100", borderRadius: 2, p: 1.25, minHeight: 200 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1, px: 0.5 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {REQUEST_STATUS_LABEL[col]}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {items.length}
                  </Typography>
                </Stack>
                <Stack spacing={1}>
                  {items.map((r) => (
                    <RequestCard
                      key={r.id}
                      request={r}
                      canAct={isEps}
                      busy={move.isPending}
                      onMove={(to) => move.mutate({ id: r.id, to })}
                      onResult={(result) => setResultFor({ request: r, result })}
                    />
                  ))}
                </Stack>
              </Box>
            );
          })}
        </Box>
      )}

      {resultFor ? (
        <ResultDialog
          request={resultFor.request}
          result={resultFor.result}
          busy={move.isPending}
          onCancel={() => setResultFor(null)}
          onConfirm={(note) =>
            move.mutate(
              { id: resultFor.request.id, to: "inspected", result: resultFor.result, note },
              { onSuccess: () => setResultFor(null) },
            )
          }
        />
      ) : null}
    </Box>
  );
}

function RequestCard({
  request: r,
  canAct,
  busy,
  onMove,
  onResult,
}: {
  request: InspectionRequest;
  canAct: boolean;
  busy: boolean;
  onMove: (to: RequestStatus) => void;
  onResult: (result: InspectionResult) => void;
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
          {inspectionTypeLabel(r.inspectionType)} · {r.workItem}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
          {r.buildingName}
          {r.location ? ` · ${r.location}` : ""}
          {r.drawingRef ? ` · ${r.drawingRef}` : ""}
        </Typography>
        <Stack direction="row" spacing={0.5} sx={{ mt: 0.75 }} flexWrap="wrap" useFlexGap>
          <ReadinessChip readiness={r.readiness} />
          {r.result ? <RequestStatusChip status={r.status} result={r.result} /> : null}
        </Stack>
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
                <Button size="small" color="success" disabled={busy} onClick={() => onResult("pass")}>
                  Pass
                </Button>
                <Button size="small" color="error" disabled={busy} onClick={() => onResult("fail")}>
                  Fail
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

function ResultDialog({
  request,
  result,
  busy,
  onCancel,
  onConfirm,
}: {
  request: InspectionRequest;
  result: InspectionResult;
  busy: boolean;
  onCancel: () => void;
  onConfirm: (note?: string) => void;
}) {
  const [note, setNote] = useState("");
  return (
    <Dialog open onClose={onCancel} fullWidth maxWidth="xs">
      <DialogTitle>Record inspection: {result === "pass" ? "Pass" : "Fail"}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 2 }}>
          {request.contractorCode} · {inspectionTypeLabel(request.inspectionType)} · {request.workItem}
        </Typography>
        <TextField
          label={result === "fail" ? "Finding / what must be fixed" : "Note (optional)"}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          multiline
          minRows={2}
          fullWidth
          autoFocus
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button variant="text" color="inherit" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          color={result === "pass" ? "success" : "error"}
          disabled={busy || (result === "fail" && !note.trim())}
          onClick={() => onConfirm(note.trim() || undefined)}
        >
          Save {result === "pass" ? "Pass" : "Fail"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

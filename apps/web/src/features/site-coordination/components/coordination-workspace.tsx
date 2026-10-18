import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Popover from "@mui/material/Popover";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog.js";
import { QueryError } from "@/components/ui/query-error.js";
import { BlockSkeleton } from "@/components/ui/skeletons.js";
import { shortDate } from "@/lib/dates.js";
import { TypePicker } from "./type-picker.js";
import { useCoordinationWorkspace } from "../hooks/use-coordination-workspace.js";
import { WorkspaceMap } from "./workspace-map.js";
import { ContractorColorDialog } from "./contractor-color-dialog.js";

export function CoordinationWorkspace(props: Parameters<typeof useCoordinationWorkspace>[0]) {
  const ed = useCoordinationWorkspace(props);
  const { projects, activeProject, date, setSelectedId, tool, addAnchor, setAddAnchor, deleteTarget, setDeleteTarget, query, remove, dayLock, lockConfirm, setLockConfirm, lockDay, data, selected, company, editableCompanies, wide, items, updateWorking, createItem, filterControls, inspector, readOnly, compact } = ed;

  return <Box>
    {compact && <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
      {filterControls}
      <Typography variant="caption" color="text.secondary" sx={{ ml: { sm: "auto" } }}>{projects.find((p) => p.id === activeProject)?.code} · {items.length} รายการ</Typography>
    </Stack>}
    {query.isError && <QueryError error={query.error} onRetry={() => void query.refetch()} />}
    {!data && !query.isError && <BlockSkeleton height={480} />}
    {data && <>
      {!readOnly && !data.lock && !editableCompanies.length && <Alert severity="info" sx={{ mb: 2 }}>บัญชีนี้ยังไม่ได้ผูกกับผู้รับเหมาในโครงการ จึงเพิ่มหรือแก้รายการงานไม่ได้</Alert>}
      <WorkspaceMap ed={ed} />
      {/* Phone: the sheet steps aside while drawing so the whole map is free to tap (the hint bar has เสร็จ). */}
      {!compact && selected && !wide && tool === "move" && <Paper elevation={8} sx={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 1200, maxHeight: "48vh", display: "flex", flexDirection: "column", borderTopLeftRadius: 16, borderTopRightRadius: 16, overflow: "hidden" }}>
        <Box sx={{ width: 36, height: 4, borderRadius: 2, bgcolor: "divider", mx: "auto", mt: 1 }} />
        {inspector}
      </Paper>}
      {compact && selected && <Typography variant="body2" sx={{ mt: 1 }}>{company?.code} · {selected.title}{selected.note ? ` — ${selected.note}` : ""}</Typography>}
    </>}
    <Popover open={Boolean(addAnchor)} anchorEl={addAnchor} onClose={() => setAddAnchor(null)} anchorOrigin={{ vertical: "bottom", horizontal: "left" }} transformOrigin={{ vertical: "top", horizontal: "left" }} slotProps={{ paper: { sx: { p: 1, mt: 0.5 } } }}>
      <Box sx={{ p: 1 }}>
        <TypePicker onPick={(icon) => { setAddAnchor(null); void createItem(icon); }} />
      </Box>
    </Popover>
    <ConfirmDialog
      open={lockConfirm}
      title={`ล็อกแผนวันที่ ${shortDate(date)}?`}
      description="หลังล็อก ทุกคน (รวมผู้รับเหมา) จะเพิ่ม ย้าย แก้ไข หรือลบงาน และแก้หมายเหตุประจำวันของวันนี้ไม่ได้ จนกว่า EPS จะกดปลดล็อก"
      confirmLabel="Lock plan"
      tone="primary"
      loading={dayLock.isPending}
      onConfirm={() => void lockDay()}
      onClose={() => setLockConfirm(false)}
    >
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{data?.items.length ?? 0} งานบนผังวันนี้</Typography>
    </ConfirmDialog>
    <ConfirmDialog
      open={Boolean(deleteTarget)}
      title="Delete work item?"
      description={deleteTarget ? `"${deleteTarget.title}" จะถูกลบ` : undefined}
      loading={remove.isPending}
      onClose={() => setDeleteTarget(null)}
      onConfirm={async () => {
        if (!deleteTarget) return;
        try { await remove.mutateAsync({ id: deleteTarget.id, revision: deleteTarget.revision }); setDeleteTarget(null); updateWorking(null); setSelectedId(null); toast.success("ลบรายการงานแล้ว"); } catch { /* Keep the dialog and show the server error. */ }
      }}
    >
      {remove.isError ? <Alert severity="error" sx={{ mt: 2 }}>{remove.error.message}</Alert> : null}
    </ConfirmDialog>
    <ContractorColorDialog ed={ed} />
  </Box>;
}

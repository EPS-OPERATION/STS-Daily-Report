import { isEpsAdmin } from "@sts/shared";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Popover from "@mui/material/Popover";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import ButtonBase from "@mui/material/ButtonBase";
import ExpandLessOutlined from "@mui/icons-material/ExpandLessOutlined";
import ExpandMoreOutlined from "@mui/icons-material/ExpandMoreOutlined";
import TuneOutlined from "@mui/icons-material/TuneOutlined";
import { Link as RouterLink } from "react-router-dom";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog.js";
import { QueryError } from "@/components/ui/query-error.js";
import { BlockSkeleton } from "@/components/ui/skeletons.js";
import { shortDate } from "@/lib/dates.js";
import { TypePicker } from "./type-picker.js";
import { CompanyPickDialog } from "./company-pick-dialog.js";
import { useCoordinationWorkspace } from "../hooks/use-coordination-workspace.js";
import { WorkspaceMap } from "./workspace-map.js";
import { ContractorColorDialog } from "./contractor-color-dialog.js";

export function CoordinationWorkspace(props: Parameters<typeof useCoordinationWorkspace>[0]) {
  const ed = useCoordinationWorkspace(props);
  const { projects, activeProject, date, setSelectedId, tool, addAnchor, setAddAnchor, deleteTarget, setDeleteTarget, query, remove, dayLock, lockConfirm, setLockConfirm, lockDay, data, selected, company, editableCompanies, wide, items, updateWorking, createItem, startCreate, pendingIcon, setPendingIcon, filteredCompanyId, filterControls, inspector, readOnly, compact, phone, fill, meeting, leaveAction, setLeaveAction, saveEdits, cancelEdits, save } = ed;
  const canManageItemTypes = !readOnly && isEpsAdmin(ed.me.data?.data.user.role);
  // Below lg the inspector is a bottom sheet. It opens as a slim strip (handle + job name) so the job stays
  // visible and draggable on the map; tapping the handle expands it for editing.
  const [sheetOpen, setSheetOpen] = useState(false);
  useEffect(() => setSheetOpen(false), [selected?.id]);

  // Fill: exactly one window tall, so the page does not scroll and the map stays put. Phone: 100dvh − 65px
  // topbar (incl. border) − main's 16px top / 80px bottom padding (clears the field bottom nav).
  // lg+: − 65px topbar − main's 24px + 24px padding (a floor keeps short windows usable; they scroll).
  // Meeting mode: above the app bar and sidebar (1200) but under popovers/dialogs/drawers (1300).
  return <Box sx={meeting ? { position: "fixed", inset: 0, zIndex: 1250, bgcolor: "background.default", p: { xs: 0, md: 1.5 }, display: "flex", flexDirection: "column" } : fill ? { height: phone ? "calc(100dvh - 161px)" : "calc(100dvh - 113px)", minHeight: phone ? undefined : 560, display: "flex", flexDirection: "column" } : undefined}>
    {compact && <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
      {filterControls}
      <Typography variant="caption" color="text.secondary" sx={{ ml: { sm: "auto" } }}>{projects.find((p) => p.id === activeProject)?.code} · {items.length} รายการ</Typography>
    </Stack>}
    {query.isError && <QueryError error={query.error} onRetry={() => void query.refetch()} />}
    {!data && !query.isError && <BlockSkeleton height={phone ? 300 : 480} />}
    {data && <>
      {!readOnly && !data.lock && !editableCompanies.length && <Alert severity="info" sx={{ mb: 2 }}>บัญชีนี้ยังไม่ได้ผูกกับผู้รับเหมาในโครงการ จึงเพิ่มหรือแก้รายการงานไม่ได้</Alert>}
      <WorkspaceMap ed={ed} />
      {/* Phone: the sheet steps aside while drawing so the whole map is free to tap (the hint bar has เสร็จ). */}
      {!compact && selected && !wide && tool === "move" && <Paper elevation={8} sx={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: meeting ? 1260 : 1200, maxHeight: sheetOpen ? "60dvh" : 104, display: "flex", flexDirection: "column", borderTopLeftRadius: 16, borderTopRightRadius: 16, overflow: "hidden" }}>
        <ButtonBase onClick={() => setSheetOpen((v) => !v)} aria-expanded={sheetOpen} aria-label={sheetOpen ? "Collapse details" : "Expand details"}
          sx={{ flexShrink: 0, height: 22, width: "100%", color: "text.secondary" }}>
          {sheetOpen ? <ExpandMoreOutlined fontSize="small" /> : <ExpandLessOutlined fontSize="small" />}
        </ButtonBase>
        {inspector}
      </Paper>}
      {compact && selected && <Typography variant="body2" sx={{ mt: 1 }}>{company?.code} · {selected.title}{selected.note ? ` — ${selected.note}` : ""}</Typography>}
    </>}
    <Popover open={Boolean(addAnchor)} anchorEl={addAnchor} onClose={() => setAddAnchor(null)} anchorOrigin={{ vertical: "bottom", horizontal: "left" }} transformOrigin={{ vertical: "top", horizontal: "left" }} slotProps={{ paper: { sx: { p: 1, mt: 0.5 } } }}>
      <Box sx={{ p: 1, maxHeight: "70vh", overflowY: "auto" }}>
        <TypePicker types={data?.itemTypes ?? []} onPick={(icon) => { setAddAnchor(null); startCreate(icon); }} />
        {canManageItemTypes ? (
          <Button
            component={RouterLink}
            to="/site-coordination/item-types"
            size="small"
            startIcon={<TuneOutlined />}
            onClick={() => setAddAnchor(null)}
            sx={{ mt: 1, width: "100%", justifyContent: "flex-start", textTransform: "none" }}
          >
            Manage item types
          </Button>
        ) : null}
      </Box>
    </Popover>
    {pendingIcon && (
      <CompanyPickDialog
        companies={editableCompanies}
        initialId={filteredCompanyId}
        road={pendingIcon === "road"}
        onClose={() => setPendingIcon(null)}
        onPick={(id) => { const icon = pendingIcon; setPendingIcon(null); void createItem(icon, id); }}
      />
    )}
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
    {/* Leaving a job with unsaved edits: save them, throw them away, or stay on the job. */}
    <ConfirmDialog
      open={Boolean(leaveAction)}
      title="บันทึกการแก้ไขก่อนไหม?"
      description="งานนี้มีการแก้ไขที่ยังไม่ได้บันทึก — บันทึกก่อนไป หรือทิ้งการแก้ไขแล้วกลับเป็นค่าเดิม"
      confirmLabel="บันทึก"
      cancelLabel="อยู่ต่อ"
      tone="primary"
      loading={save.isPending}
      onClose={() => setLeaveAction(null)}
      onConfirm={async () => {
        const action = leaveAction;
        if (!(await saveEdits())) return;
        setLeaveAction(null); action?.();
      }}
      secondaryAction={{ label: "ทิ้งการแก้ไข", onClick: () => { const action = leaveAction; cancelEdits(); setLeaveAction(null); action?.(); } }}
    />
    <ContractorColorDialog ed={ed} />
  </Box>;
}

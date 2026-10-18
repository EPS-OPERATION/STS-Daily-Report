import { CopySourcePanel } from "./copy-source-button.js";
import { crewTotals } from "./crew-manpower.js";
import { ConfirmDialog } from "@/components/ui/confirm-dialog.js";
import { DraftBanner, DraftSavedNote, FormProgress } from "./form-aids.js";
import { formatThaiDate } from "@/lib/dates.js";
import { scrollToSection } from "../utils/form-sections.js";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import { disciplineLabel } from "./morning-helpers.js";
import { MorningCrewSection } from "./morning-crew-section.js";
import { useMorningForm } from "../hooks/use-morning-form.js";
import { MorningGeneralSection } from "./morning-general-section.js";
import { MorningWeatherSection } from "./morning-weather-section.js";
import { MorningEquipmentSection } from "./morning-equipment-section.js";
import { MorningPermitsSection } from "./morning-permits-section.js";
import { GoToButton } from "./morning-form-parts.js";

export function MorningForm(props: Parameters<typeof useMorningForm>[0]) {
  const ed = useMorningForm(props);
  const { submit, form, draft, validationError, copying, copyNotice, setCopyNotice, copied, confirmCopy, setConfirmCopy, applyCopy, startCopy, undoCopy, dayStart, dayEnd, crewValues, picked, placementProblem, crewReady, submitOrShowMissing, serverError, canSubmit, checklist, projectId, date, contractor, buildings, report } = ed;

  return (
    <Box component="form" onSubmit={submitOrShowMissing} noValidate>
      {draft.pending ? <DraftBanner savedAt={draft.pending.savedAt} onRestore={draft.restore} onDiscard={draft.discard} /> : null}
      <FormProgress items={checklist} />
      {report?.morningStatus === "submitted" ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          ส่งรายงานเช้าแล้ว — แก้ไขและส่งใหม่ได้ถึง 12:00 น. ของวันถัดไป
        </Alert>
      ) : null}

      <CopySourcePanel
        projectId={projectId}
        contractorId={contractor.id}
        date={date}
        disabled={copying || submit.isPending}
        onPick={(day) => void startCopy(day)}
      />
      {copyNotice ? (
        <Alert severity="info" sx={{ mb: 2 }} onClose={() => setCopyNotice(null)}>
          {copyNotice}
        </Alert>
      ) : null}
      {copied ? (
        <Alert
          severity="info"
          sx={{ mb: 2 }}
          action={
            <Button color="primary" size="small" onClick={undoCopy}>
              ย้อนกลับ
            </Button>
          }
        >
          คัดลอกจากรายงานวันที่ {formatThaiDate(copied.date)} แล้ว — ตรวจสอบจำนวนคนและงานก่อนส่ง
        </Alert>
      ) : null}
      <ConfirmDialog
        open={Boolean(confirmCopy)}
        title="แทนที่ข้อมูลที่กรอกไว้วันนี้?"
        description={`คน งาน และเครื่องจักรที่กรอกไว้จะถูกแทนที่ด้วยข้อมูลจากวันที่ ${confirmCopy ? formatThaiDate(confirmCopy.reportDate) : ""}`}
        confirmLabel="คัดลอกและแทนที่"
        cancelLabel="ยกเลิก"
        tone="primary"
        onConfirm={() => confirmCopy && applyCopy(confirmCopy)}
        onClose={() => setConfirmCopy(null)}
      />

      <MorningGeneralSection ed={ed} />

      <MorningWeatherSection ed={ed} />

      {picked.map((d, i) => (
        <MorningCrewSection
          key={d}
          index={3 + i}
          discipline={d}
          form={form}
          buildings={buildings}
          dayStart={dayStart}
          dayEnd={dayEnd}
          projectId={projectId}
          contractorId={contractor.id}
        />
      ))}

      <MorningEquipmentSection ed={ed} />

      <MorningPermitsSection ed={ed} />

      {validationError ? (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {validationError}
        </Alert>
      ) : null}

      {serverError ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {serverError.message}
        </Alert>
      ) : null}

      <Box
        sx={{
          position: "sticky",
          bottom: { xs: 64, md: 0 },
          zIndex: 3,
          bgcolor: "background.paper",
          borderTop: 1,
          borderColor: "divider",
          mx: { xs: -2, md: 0 },
          px: 2,
          py: 1.5,
        }}
      >
        {picked.length === 0 ? (
          <Alert severity="warning" sx={{ mb: 1, py: 0 }} action={<GoToButton onClick={() => scrollToSection("sec-general")} />}>
            ยังไม่ได้เลือกประเภทงาน
          </Alert>
        ) : null}
        {picked
          .filter((d) => !crewReady(d))
          .map((d) => {
            const t = crewTotals(crewValues[d]);
            return (
              <Alert key={d} severity="warning" sx={{ mb: 1, py: 0 }} action={<GoToButton onClick={() => scrollToSection(`sec-crew-${d}`)} />}>
                {disciplineLabel(d)}:{" "}
                {t.total === 0
                  ? "ยังไม่ได้กรอกจำนวนคน"
                  : !t.ok
                    ? `สัญชาติ/เพศ ${t.byNationality} คน ไม่ตรงกับตามตำแหน่ง ${t.total} คน`
                    : placementProblem(d)}
              </Alert>
            );
          })}
        <Button type="submit" fullWidth disabled={!canSubmit}>
          {submit.isPending
            ? "กำลังส่ง…"
            : report?.morningStatus === "submitted"
              ? "บันทึกการแก้ไขรายงานเช้า"
              : "บันทึก / ส่งรายงานเช้า"}
        </Button>
        <DraftSavedNote savedAt={draft.savedAt} />
      </Box>
    </Box>
  );
}

import { DraftBanner, DraftSavedNote, FormProgress } from "./form-aids.js";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import { useEveningForm } from "../hooks/use-evening-form.js";
import { EveningSafetySection } from "./evening-safety-section.js";
import { EveningOvertimeSection } from "./evening-overtime-section.js";
import { EveningCrewSection } from "./evening-crew-section.js";
import { EveningProgressSection } from "./evening-progress-section.js";
import { EveningTomorrowSection } from "./evening-tomorrow-section.js";
import { EveningSignSection } from "./evening-sign-section.js";

export function EveningForm(props: Parameters<typeof useEveningForm>[0]) {
  const ed = useEveningForm(props);
  const { submit, validationError, draft, submitOrShowMissing, serverError, checklist, report } = ed;

  return (
    <Box component="form" onSubmit={submitOrShowMissing} noValidate>
      {draft.pending ? <DraftBanner savedAt={draft.pending.savedAt} onRestore={draft.restore} onDiscard={draft.discard} /> : null}
      <FormProgress items={checklist} />
      <EveningSafetySection ed={ed} />

      <EveningOvertimeSection ed={ed} />

      <EveningCrewSection ed={ed} />

      <EveningProgressSection ed={ed} />

      <EveningTomorrowSection ed={ed} />

      {/* Materials on site — future feature, hidden for now (schema/API/material-inputs kept). */}

      <EveningSignSection ed={ed} />

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
        <Button type="submit" fullWidth disabled={submit.isPending} sx={{ bgcolor: "navy.main" }}>
          {submit.isPending ? "กำลังส่ง…" : report?.eveningStatus === "submitted" ? "Save Daily Request changes" : "Submit Daily Request"}
        </Button>
        <DraftSavedNote savedAt={draft.savedAt} />
      </Box>
    </Box>
  );
}

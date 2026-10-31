import { SectionCard } from "./section-card.js";
import { PermitRequests } from "./permit-requests.js";
import { PermitPhotos } from "./permit-photos.js";
import { useEnsureDraft } from "../hooks/use-daily-report-mutations.js";
import type { UseMorningFormState } from "../hooks/use-morning-form.js";

export function MorningPermitsSection({ ed }: { ed: UseMorningFormState }) {
  const { control, picked, projectId, contractor, buildings, report, date } = ed;
  const ensureDraft = useEnsureDraft(projectId);
  return (
    <SectionCard
      id="sec-permits"
      index={4 + picked.length}
      title="ใบอนุญาตงานเสี่ยง (Work Permits)"
      subtitle="สำหรับงานเสี่ยงที่จะทำวันนี้ (Hot Work, Work at Height, Lifting ฯลฯ)"
    >
      <PermitRequests control={control} buildings={buildings} projectId={projectId} contractorId={contractor.id}
        renderPhotos={(photoKey) => <PermitPhotos photoKey={photoKey} reportId={report?.id ?? null} photos={report?.photos ?? []}
          ensureReportId={async () => (await ensureDraft.mutateAsync({ date, contractorId: contractor.id })).data.id} />} />
    </SectionCard>
  );
}

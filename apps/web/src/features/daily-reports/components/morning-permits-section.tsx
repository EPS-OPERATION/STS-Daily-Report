import { SectionCard } from "./section-card.js";
import { PermitRequests } from "./permit-requests.js";
import type { UseMorningFormState } from "../hooks/use-morning-form.js";

export function MorningPermitsSection({ ed }: { ed: UseMorningFormState }) {
  const { control, picked, projectId, contractor, buildings } = ed;
  return (
    <SectionCard
      id="sec-permits"
      index={4 + picked.length}
      title="ใบอนุญาตงานเสี่ยง (Work Permits)"
      subtitle="สำหรับงานเสี่ยงที่จะทำวันนี้ (Hot Work, Work at Height, Lifting ฯลฯ)"
    >
      <PermitRequests control={control} buildings={buildings} projectId={projectId} contractorId={contractor.id} />
    </SectionCard>
  );
}

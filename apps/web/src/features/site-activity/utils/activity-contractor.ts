// Pure contractor write-permission helpers for the Activity form.
// A user may VIEW every Project Contractor but may only SUBMIT for Contractors
// they are an active member of — unless they are a site-management admin, who
// may submit for any Contractor assigned to the Project. The backend enforces
// the same rule; these helpers only shape frontend defaults and options.

export function writableContractorIds(options: {
  isAdmin: boolean;
  membershipIds: string[];
  projectIds: string[];
}): string[] {
  if (options.isAdmin) return [...options.projectIds];
  return options.projectIds.filter((id) => options.membershipIds.includes(id));
}

export function autoSelectContractorId(options: {
  isNew: boolean;
  current: string;
  membershipIds: string[];
  projectIds: string[];
}): string | null {
  // New Activities only, never overwrite an explicit choice (including edits).
  // Auto-select solely from the user's own memberships: never because a
  // Contractor is first, alone in the Project, or previously used by others.
  if (!options.isNew || options.current) return null;
  const eligible = options.projectIds.filter((id) => options.membershipIds.includes(id));
  return eligible.length === 1 ? eligible[0]! : null;
}

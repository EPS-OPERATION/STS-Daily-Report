// User roles. contractor = supplier field app; eps_site = EPS operations staff;
// eps_admin = EPS system administrators (only they manage roles and account status).
export const USER_ROLES = ["contractor", "eps_site", "eps_admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

// Unknown values fall back to the least-privileged role.
export function toUserRole(role: string | null | undefined): UserRole {
  return role === "eps_site" || role === "eps_admin" ? role : "contractor";
}

export function isEpsStaff(role: string | null | undefined): boolean {
  return role === "eps_site" || role === "eps_admin";
}

export function isEpsAdmin(role: string | null | undefined): boolean {
  return role === "eps_admin";
}

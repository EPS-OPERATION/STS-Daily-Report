import { isEpsAdmin, isEpsStaff } from "@sts/shared";
import type { AuthContext } from "@/auth/auth.types.js";
import { ForbiddenError } from "@/shared/errors/app-error.js";

// eps_site and eps_admin may run EPS operations (review, QAQC, safety, approvals).
export function assertEpsStaff(auth: AuthContext) {
  if (!isEpsStaff(auth.user.role)) throw new ForbiddenError("Only EPS staff can do this");
}

// Role changes and account status are eps_admin only.
export function assertEpsAdmin(auth: AuthContext) {
  if (!isEpsAdmin(auth.user.role)) throw new ForbiddenError("Only an EPS administrator can do this");
}

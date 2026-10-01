import type { AuthContext, AuthUser } from "@/auth/auth.types.js";
import { ForbiddenError } from "@/shared/errors/app-error.js";

export function assertCanManageSiteConfiguration(user: Pick<AuthUser, "canManageSiteConfiguration">) {
  if (user.canManageSiteConfiguration !== true) throw new ForbiddenError();
}

// Per-route hook: operational reads do not acquire this administrative guard.
export function requireSiteConfiguration({ auth }: { auth: AuthContext }) {
  assertCanManageSiteConfiguration(auth.user);
}

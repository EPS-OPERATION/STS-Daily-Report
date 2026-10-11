import type { AuthContext } from "@/auth/auth.types.js";
import { ForbiddenError } from "@/shared/errors/app-error.js";

export function assertEps(auth: AuthContext) {
  if (auth.user.role !== "eps") throw new ForbiddenError("Only EPS staff can manage users");
}

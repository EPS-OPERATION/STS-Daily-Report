// Provider-independent identity. Everything below this boundary
// (users, memberships, /me, feature authorization) must keep working
// when the identity source changes (local-email today, Entra/OIDC/bearer later).

export type AuthMethod = "session";

export interface AuthIdentity {
  userId: string;
  email: string;
  method: AuthMethod;
}

export interface AuthUser {
  id: string;
  email: string;
  displayName: string | null;
  canManageSiteConfiguration: boolean;
}

export interface AuthContext {
  user: AuthUser;
  identity: { method: AuthMethod };
}

export interface MembershipContractor {
  id: string;
  code: string;
  name: string;
}

export interface MeResponse {
  data: {
    user: AuthUser;
    contractors: MembershipContractor[];
  };
}

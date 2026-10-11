export interface AuthUser {
  id: string;
  email: string;
  displayName: string | null;
  role: "contractor" | "eps";
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

export interface LoginResponse {
  data: {
    user: AuthUser;
    contractors: MembershipContractor[];
  };
}

export type LoginPayload = { identifier: string; password: string } | { email: string; accessCode?: string };
export interface RegisterPayload { email: string; username: string; password: string; contractorId?: string; companyName?: string }
export interface ContractorOption { id: string; code: string; name: string }

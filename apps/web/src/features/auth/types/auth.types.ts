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

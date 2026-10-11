// Stable seeded identities only. New registrations never qualify for email-only login.
export const DEMO_ACCOUNTS = [
  { id: "44444444-4444-4444-8444-444444444444", email: "contractor@sts.local", username: "contractor" },
  { id: "99999999-9999-4999-8999-999999999999", email: "eps@sts.local", username: "eps" },
  { id: "aaaaaaaa-aaaa-4aaa-8aaa-000000000001", email: "contractor01@sts.local", username: "contractor01" },
  { id: "aaaaaaaa-aaaa-4aaa-8aaa-000000000002", email: "contractor02@sts.local", username: "contractor02" },
  { id: "aaaaaaaa-aaaa-4aaa-8aaa-000000000003", email: "contractor03@sts.local", username: "contractor03" },
  { id: "aaaaaaaa-aaaa-4aaa-8aaa-0000000000f1", email: "trial@sts.local", username: "trial" },
] as const;

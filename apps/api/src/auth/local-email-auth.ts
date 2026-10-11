// Legacy demo provider only: email lookup does not verify identity.
// Eligibility is restricted to the stable seeded accounts in demo-accounts.ts.
// Production requires ALLOW_DEMO_LOGIN; normal production uses AUTH_PROVIDER=password.

export const LOCAL_EMAIL_PROVIDER = "local-email" as const;

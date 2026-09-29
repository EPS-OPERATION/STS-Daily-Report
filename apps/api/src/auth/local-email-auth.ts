// TEMPORARY DEVELOPMENT-ONLY identity source.
//
// Email lookup is NOT identity verification: anyone who knows an address
// could impersonate its owner. This provider exists so the auth boundary
// (AuthIdentity -> user -> memberships) can be built and tested before a
// real provider (Entra/OIDC/bearer) lands.
//
// - Never use in production: startup refuses AUTH_PROVIDER=local-email
//   when NODE_ENV=production (see packages/env).
// - No password, OTP, signup, or token issuance of any other kind here.

export const LOCAL_EMAIL_PROVIDER = "local-email" as const;

import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@sts/shared";

export const MIN_PASSWORD_LENGTH = PASSWORD_MIN_LENGTH;
export const MAX_PASSWORD_LENGTH = PASSWORD_MAX_LENGTH;

export function hashPassword(password: string) {
  return Bun.password.hash(password, { algorithm: "argon2id", memoryCost: 65536, timeCost: 2 });
}

// Verify nonexistent/passwordless accounts too, avoiding a cheap account-existence signal.
let dummyHash: Promise<string> | undefined;
export async function verifyPassword(password: string, hash: string | null | undefined) {
  dummyHash ??= hashPassword("unused-dummy-password");
  const matched = await Bun.password.verify(password, hash ?? await dummyHash);
  return Boolean(hash && matched);
}

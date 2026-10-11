// Password quality rules shared by the API (enforcement) and the web forms (live checklist):
// at least 8 characters and at least 3 of the 4 character classes.
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;
export const PASSWORD_CLASS_MIN = 3;

export interface PasswordChecks {
  length: boolean;
  lower: boolean;
  upper: boolean;
  digit: boolean;
  special: boolean;
  classes: number;
  classRequirement: boolean;
  valid: boolean;
}

export function checkPassword(password: string): PasswordChecks {
  const length = password.length >= PASSWORD_MIN_LENGTH;
  const lower = /[a-z]/.test(password);
  const upper = /[A-Z]/.test(password);
  const digit = /[0-9]/.test(password);
  const special = /[^A-Za-z0-9]/.test(password);
  const classes = [lower, upper, digit, special].filter(Boolean).length;
  const classRequirement = classes >= PASSWORD_CLASS_MIN;
  return { length, lower, upper, digit, special, classes, classRequirement, valid: length && classRequirement };
}

export const PASSWORD_RULE_MESSAGE =
  "Use at least 8 characters, including at least 3 of: lowercase letters, uppercase letters, numbers, special characters.";

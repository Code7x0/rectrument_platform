/**
 * India-only mobile validation for Partner registration.
 * Exactly 10 digits, no country code / spaces / punctuation.
 * Leading digit 6–9 (valid Indian mobile series).
 */

export const INDIAN_MOBILE_RE = /^[6-9]\d{9}$/;

export function normalizeIndianMobileInput(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 10);
}

export function isValidIndianMobile(value: string): boolean {
  return INDIAN_MOBILE_RE.test(value.trim());
}

export const INDIAN_MOBILE_ERROR =
  "Enter a valid 10-digit Indian mobile number (digits only, no +91)";

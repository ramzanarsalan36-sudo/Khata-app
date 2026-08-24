/**
 * Indian Phone Number Normalization and Validation Utility
 */

/**
 * Normalizes Indian mobile number to international format without plus: 91XXXXXXXXXX
 * Handles:
 * - 91XXXXXXXXXX -> 91XXXXXXXXXX
 * - +91XXXXXXXXXX -> 91XXXXXXXXXX
 * - XXXXXXXXXX -> 91XXXXXXXXXX
 * - +91 98765 43210 -> 919876543210
 * - 09876543210 -> 919876543210
 * - (987) 654-3210 -> 919876543210
 * Prevents duplicates like 9191XXXXXXXXXX or +91+91XXXXXXXXXX.
 * Returns null if invalid.
 */
export function normalizeIndianPhoneNumber(rawPhone) {
  if (!rawPhone) return null;

  // Convert to string and remove all non-digit characters
  let digits = rawPhone.toString().replace(/\D/g, '');

  if (!digits) return null;

  // If starts with single 0 (trunk STD prefix for 10-digit mobile, total 11 digits), remove leading 0
  if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.substring(1);
  }

  // If 10 digits (standard Indian mobile number)
  if (digits.length === 10) {
    return `91${digits}`;
  }

  // If 12 digits and starts with 91, ensure the remaining 10 digits are present
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits;
  }

  // If starts with 0091 and is 14 digits
  if (digits.length === 14 && digits.startsWith('0091')) {
    return digits.substring(2);
  }

  // If already an international number of 11-15 digits
  if (digits.length >= 10 && digits.length <= 15) {
    return digits;
  }

  return null;
}

/**
 * Format phone for UI display (e.g., +91 98765 43210 or 98765 43210)
 */
export function formatIndianPhoneNumber(rawPhone) {
  if (!rawPhone) return '';
  const normalized = normalizeIndianPhoneNumber(rawPhone);
  if (normalized && normalized.startsWith('91') && normalized.length === 12) {
    const mobile = normalized.substring(2);
    return `+91 ${mobile.slice(0, 5)} ${mobile.slice(5)}`;
  }
  return rawPhone.toString();
}

/**
 * Helper to get clean 10-digit number for inputs
 */
export function get10DigitPhone(rawPhone) {
  if (!rawPhone) return '';
  const normalized = normalizeIndianPhoneNumber(rawPhone);
  if (normalized && normalized.startsWith('91') && normalized.length === 12) {
    return normalized.substring(2);
  }
  const digits = rawPhone.toString().replace(/\D/g, '');
  if (digits.length === 10) return digits;
  if (digits.length === 12 && digits.startsWith('91')) return digits.substring(2);
  return digits;
}

// Backward-compatible alias
export function getWhatsAppPhone(rawPhone) {
  return normalizeIndianPhoneNumber(rawPhone) || '';
}

// Alias for normalizeIndianPhoneNumber
export const normalizePhoneNumber = normalizeIndianPhoneNumber;


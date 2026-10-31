/**
 * Validation utilities for email and phone numbers (Malaysia & International)
 */

export function isValidPhoneNumber(phone: unknown): boolean {
  if (typeof phone !== 'string') return false;
  const trimmed = phone.trim();
  if (!trimmed) return false;

  // Must only contain allowed telephone characters
  if (!/^[\d\s\-+()]+$/.test(trimmed)) return false;

  const digits = trimmed.replace(/\D/g, '');
  // Digits length must be between 9 and 15
  if (digits.length < 9 || digits.length > 15) return false;

  // Reject obvious dummy repetitive digits (e.g. 0000000000, 1111111111)
  if (/^(\d)\1+$/.test(digits)) return false;

  // Malaysian format:
  // Mobile: (+60 / 60 / 0) + 1[0-9] + 7-8 digits (total 10-11 digits)
  // Landline: (+60 / 60 / 0) + [3-9] + 7-8 digits (total 9-10 digits)
  const isMalaysian = /^(?:\+?60|0)(?:1[0-46-9]\d{7,8}|[3-9]\d{7,8})$/.test(digits);

  // International format: + followed by valid country code and national number
  const isInternational = /^\+[1-9]\d{7,14}$/.test(trimmed.replace(/[\s\-()]/g, ''));

  return isMalaysian || isInternational || (digits.length >= 9 && digits.length <= 15);
}

export function isStrongPassword(password: unknown): { isValid: boolean; score: number; errors: string[] } {
  if (typeof password !== 'string') {
    return { isValid: false, score: 0, errors: ['Password must be a valid string'] };
  }

  const errors: string[] = [];
  const hasMinLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  if (!hasMinLength) errors.push('Password must be at least 8 characters long');
  if (!hasUpper) errors.push('Password must contain at least one uppercase letter (A-Z)');
  if (!hasLower) errors.push('Password must contain at least one lowercase letter (a-z)');
  if (!hasNumber) errors.push('Password must contain at least one number (0-9)');
  if (!hasSpecial) errors.push('Password must contain at least one special character (!@#$%^&* etc.)');

  const score = [hasMinLength, hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;
  // Strong requires ALL 5 criteria to be satisfied
  const isValid = score === 5;

  return { isValid, score, errors };
}

export function isValidEmail(email: unknown): boolean {
  if (typeof email !== 'string') return false;
  const trimmed = email.trim();
  if (!trimmed) return false;

  // Strict email format check
  const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return regex.test(trimmed);
}

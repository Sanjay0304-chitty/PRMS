/**
 * Validation utilities for email, phone numbers, and strong passwords
 */

/**
 * Validates Malaysian and standard international phone numbers.
 * Accepts formats such as:
 * - 012-345 6789, 0123456789, 011-12345678, 03-12345678
 * - +60 12-345 6789, +60123456789
 * - International standard E.164: +1234567890
 */
export function isValidPhoneNumber(phone) {
  if (typeof phone !== 'string') return false;
  const trimmed = phone.trim();
  if (!trimmed) return false;

  // Must only contain digits, spaces, hyphens, plus, parentheses
  if (!/^[\d\s\-+()]+$/.test(trimmed)) return false;

  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 9 || digits.length > 15) return false;

  // Reject dummy repetitive sequences (e.g. 000000000, 1111111111)
  if (/^(\d)\1+$/.test(digits)) return false;

  // Malaysian format:
  // Mobile: (+60 / 60 / 0) + 1[0-46-9] + 7-8 digits (total 10-11 digits)
  // Landline: (+60 / 60 / 0) + [3-9] + 7-8 digits (total 9-10 digits)
  const isMalaysian = /^(?:\+?60|0)(?:1[0-46-9]\d{7,8}|[3-9]\d{7,8})$/.test(digits);

  // International format: starts with + followed by 8 to 15 digits
  const isInternational = /^\+[1-9]\d{7,14}$/.test(trimmed.replace(/[\s\-()]/g, ''));

  return isMalaysian || isInternational || (digits.length >= 9 && digits.length <= 15);
}

/**
 * Strict email address validation
 */
export function isValidEmail(email) {
  if (typeof email !== 'string') return false;
  const trimmed = email.trim();
  if (!trimmed) return false;

  const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return regex.test(trimmed);
}

/**
 * Password strength evaluation:
 * Requirements:
 * 1. At least 8 characters
 * 2. Big letter (Uppercase: [A-Z])
 * 3. Small letter (Lowercase: [a-z])
 * 4. Number ([0-9])
 * 5. Special character ([^A-Za-z0-9] or [!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?])
 *
 * Statuses:
 * - 'weak' (Red): 0-2 requirements met or length < 8
 * - 'medium' (Yellow/Orange): 3-4 requirements met
 * - 'strong' (Green): ALL 5 requirements met
 */
export function evaluatePasswordStrength(password) {
  const pwd = typeof password === 'string' ? password : '';
  
  const hasMinLength = pwd.length >= 8;
  const hasUpper = /[A-Z]/.test(pwd);
  const hasLower = /[a-z]/.test(pwd);
  const hasNumber = /[0-9]/.test(pwd);
  const hasSpecial = /[^A-Za-z0-9]/.test(pwd);

  const criteria = {
    hasMinLength,
    hasUpper,
    hasLower,
    hasNumber,
    hasSpecial,
  };

  const score = [hasMinLength, hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;

  let status;
  let label;
  let color;

  if (!pwd) {
    status = 'empty';
    label = 'Not entered';
    color = '#94a3b8';
  } else if (score === 5) {
    status = 'strong';
    label = 'Strong';
    color = '#10b981'; // Green
  } else if (score >= 3) {
    status = 'medium';
    label = 'OK / Medium';
    color = '#f59e0b'; // Yellow / Orange
  } else {
    status = 'weak';
    label = 'Weak';
    color = '#ef4444'; // Red
  }

  const isStrong = score === 5;

  const errors = [];
  if (!hasMinLength) errors.push('At least 8 characters');
  if (!hasUpper) errors.push('At least one uppercase letter (A-Z)');
  if (!hasLower) errors.push('At least one lowercase letter (a-z)');
  if (!hasNumber) errors.push('At least one number (0-9)');
  if (!hasSpecial) errors.push('At least one special character (!@#$%^&* etc.)');

  return {
    score,
    status,
    label,
    color,
    isStrong,
    criteria,
    errors,
  };
}

export function isPasswordStrong(password) {
  return evaluatePasswordStrength(password).isStrong;
}

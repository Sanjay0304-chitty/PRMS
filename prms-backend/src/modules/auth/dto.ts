import { body } from 'express-validator';
import { isValidPhoneNumber, isStrongPassword } from '../../utils/validators';

export const registerBody = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').custom((val) => {
    const res = isStrongPassword(val);
    if (!res.isValid) {
      throw new Error(res.errors[0] || 'Password must be strong (at least 8 characters, with uppercase, lowercase, number, and special character)');
    }
    return true;
  }),
  body('full_name').optional().isString(),
  body('phone').optional({ checkFalsy: true }).custom((val) => {
    if (!isValidPhoneNumber(val)) {
      throw new Error('Please enter a valid phone number (e.g. 012-345 6789 or +60123456789)');
    }
    return true;
  }),
  // 'Admin' is deliberately excluded from public self-registration — an Admin
  // account must never be obtainable by an anonymous signup request.
  body('role').optional().isIn(['Landlord', 'Tenant', 'Agent']).withMessage('Valid role required'),
];

export const checkEmailBody = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
];

export const loginBody = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required'),
];

export const refreshBody = [
  body('refreshToken').notEmpty().withMessage('Refresh token required'),
];

export const verifyOtpBody = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('otp').notEmpty().withMessage('OTP code required'),
];

export const resetPasswordBody = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('otp').notEmpty().withMessage('OTP code required'),
  body('newPassword').custom((val) => {
    const res = isStrongPassword(val);
    if (!res.isValid) {
      throw new Error(res.errors[0] || 'Password must be strong (at least 8 characters, with uppercase, lowercase, number, and special character)');
    }
    return true;
  }),
  body('confirmPassword').notEmpty().withMessage('Confirm password required'),
];


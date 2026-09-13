import { body } from 'express-validator';

export const registerBody = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('full_name').optional().isString(),
  body('phone').optional().isString(),
  // 'Admin' is deliberately excluded from public self-registration — an Admin
  // account must never be obtainable by an anonymous signup request.
  body('role').optional().isIn(['Landlord', 'Tenant', 'Agent']).withMessage('Valid role required'),
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
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  body('confirmPassword').notEmpty().withMessage('Confirm password required'),
];

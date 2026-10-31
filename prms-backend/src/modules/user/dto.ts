import { body, param, query } from 'express-validator';
import { isValidPhoneNumber, isStrongPassword } from '../../utils/validators';

export const createUserBody = [
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
  body('role').optional().isIn(['Admin', 'Landlord', 'Tenant', 'Agent']),
];

export const updateUserBody = [
  body('full_name').optional().isString(),
  body('phone').optional({ checkFalsy: true }).custom((val) => {
    if (!isValidPhoneNumber(val)) {
      throw new Error('Please enter a valid phone number (e.g. 012-345 6789 or +60123456789)');
    }
    return true;
  }),
  body('is_active').optional().isBoolean(),
];

export const userQuery = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('search').optional().isString(),
  query('role').optional().isString(),
  query('is_active').optional().isIn(['true', 'false']),
];

export const userIdParam = [param('id').isUUID()];

export const changeRoleBody = [
  body('role').isIn(['Admin', 'Landlord', 'Tenant', 'Agent']).withMessage('Valid role required'),
];

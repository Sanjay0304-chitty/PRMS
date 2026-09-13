import { body, param, query } from 'express-validator';

export const createUserBody = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('full_name').optional().isString(),
  body('phone').optional().isString(),
  body('role').optional().isIn(['Admin', 'Landlord', 'Tenant', 'Agent']),
];

export const updateUserBody = [
  body('full_name').optional().isString(),
  body('phone').optional().isString(),
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

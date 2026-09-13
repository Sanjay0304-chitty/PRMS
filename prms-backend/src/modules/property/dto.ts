import { body, param, query } from 'express-validator';

export const createPropertyBody = [
  body('title').trim().notEmpty().isLength({ min: 3, max: 150 }).withMessage('Title must be 3-150 characters'),
  body('address').trim().notEmpty().isLength({ min: 5 }).withMessage('Address must be at least 5 characters'),
  body('property_type').optional().isString(),
  body('description').optional().isString(),
  body('rent').isFloat({ gt: 0 }).withMessage('Rent must be greater than zero'),
  body('status').optional().isIn(['AVAILABLE', 'RENTED', 'MAINTENANCE', 'INACTIVE']),
  body('city').optional().isString(),
  body('state').optional().isString(),
  body('availableFrom').optional().isISO8601(),
  body('availableTo').optional().isISO8601(),
  body('videoUrls').optional().isArray(),
  body('documentUrls').optional().isArray(),
];

export const updatePropertyBody = [
  // Individual validators
  body('title').optional({ nullable: true }).trim().isLength({ min: 3, max: 150 }).withMessage('Title must be 3-150 characters'),
  body('address').optional({ nullable: true }).trim().isLength({ min: 5 }).withMessage('Address minimum 5 characters'),
  body('property_type').optional().isString(),
  body('description').optional({ nullable: true }).isString(),
  body('rent').optional({ nullable: true }).isFloat({ gt: 0 }).withMessage('Rent must be greater than 0'),
  body('status').optional({ nullable: true }).isIn(['AVAILABLE', 'RENTED', 'MAINTENANCE', 'INACTIVE']),
  body('city').optional({ nullable: true }).isString(),
  body('state').optional({ nullable: true }).isString(),
  body('availableFrom').optional({ nullable: true }).isISO8601(),
  body('availableTo').optional({ nullable: true }).isISO8601(),
  body('videoUrls').optional({ nullable: true }).isArray(),
  body('documentUrls').optional({ nullable: true }).isArray(),
  // At-least-one guard
  (req: any, _res: any, next: any) => {
    const coreKeys = ['title', 'address', 'property_type', 'description', 'rent', 'status', 'city', 'state'];
    const hasCore = coreKeys.some((k) => req.body[k] !== undefined);
    const hasMedia = Array.isArray(req.body.images) || Array.isArray(req.body.videos) || Array.isArray(req.body.videoUrls) || Array.isArray(req.body.documentUrls);
    const hasAmenities = Array.isArray(req.body.amenities);
    const hasDates = req.body.availableFrom !== undefined || req.body.availableTo !== undefined;
    if (!hasCore && !hasMedia && !hasAmenities && !hasDates) {
      return next(new Error('At least one core field, media, amenity, or date must be present in the request'));
    }
    next();
  },
];

export const propertyIdParam = [param('id').isUUID()];

import rateLimit from 'express-rate-limit';
import { env } from '../config';

export const apiLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  message: {
    success: false,
    error: { message: 'Too many requests. Please try again later.' },
  },
  skip: (req) => {
    if (env.NODE_ENV === 'test') return true;
    const path = req.originalUrl || req.url || '';
    return path.includes('/auth') || path.includes('/health');
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.NODE_ENV === 'production' ? 20 : 1000,
  message: {
    success: false,
    error: { message: 'Too many authentication attempts. Please try again in 15 minutes.' },
  },
  skip: () => env.NODE_ENV === 'test',
  standardHeaders: true,
  legacyHeaders: false,
});


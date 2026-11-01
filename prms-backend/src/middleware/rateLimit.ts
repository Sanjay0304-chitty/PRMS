import rateLimit from 'express-rate-limit';
import { env } from '../config';
import { apiRequestBudget } from './requestPolicy';

export const apiLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: apiRequestBudget(env.NODE_ENV, env.RATE_LIMIT_MAX_REQUESTS),
  message: {
    success: false,
    error: { message: 'Too many requests. Please try again later.' },
  },
  skip: (req) => {
    if (env.NODE_ENV === 'test') return true;
    const path = (req.originalUrl || req.url || '').split('?')[0].replace(/^\/api(?=\/|$)/, '');
    return path === '/auth' || path.startsWith('/auth/') || path === '/health';
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


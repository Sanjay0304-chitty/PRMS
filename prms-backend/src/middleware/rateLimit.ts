import rateLimit from 'express-rate-limit';
import { env } from '../config';

export const apiLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  message: {
    success: false,
    error: { message: 'Too many requests. Please try again later.' },
  },
  skip: (req) => req.url.startsWith('/auth/login') || req.url.startsWith('/auth/register') || req.url.startsWith('/auth/refresh'),
  standardHeaders: true,
  legacyHeaders: false,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    error: { message: 'Too many authentication attempts. Please try again in 15 minutes.' },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

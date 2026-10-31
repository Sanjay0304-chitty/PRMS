import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import { env } from '../config';

export type GuardEventKind = 'scanner' | 'injection' | 'login_fail' | 'banned_hit' | 'flood';

export interface GuardEvent {
  ip: string;
  kind: GuardEventKind;
  path: string;
  blocked: boolean;
  at: number; // Unix timestamp in seconds
}

// In-memory guard state
let currentBlocks = new Set<string>();
let isLockdown = false;
let eventQueue: GuardEvent[] = [];
let totalRequestsCount = 0;
let flushTimer: NodeJS.Timeout | null = null;
let heartbeatTimer: NodeJS.Timeout | null = null;
let cleanupTimer: NodeJS.Timeout | null = null;

// Rate limiting map for flood detection
interface FloodRecord {
  count: number;
  resetAt: number;
}
const ipFloodMap = new Map<string, FloodRecord>();

/**
 * Reset guard state (used in testing and re-initialization)
 */
export function resetGuardState() {
  currentBlocks.clear();
  isLockdown = false;
  eventQueue = [];
  totalRequestsCount = 0;
  ipFloodMap.clear();
  if (flushTimer) clearInterval(flushTimer);
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  if (cleanupTimer) clearInterval(cleanupTimer);
  flushTimer = null;
  heartbeatTimer = null;
  cleanupTimer = null;
}

export function getCurrentBlocks(): Set<string> {
  return currentBlocks;
}

export function setBlocks(blocks: string[]) {
  currentBlocks = new Set(blocks);
}

export function setLockdown(lockdown: boolean) {
  isLockdown = lockdown;
}

export function getEventQueue(): GuardEvent[] {
  return eventQueue;
}

/**
 * Creates signed Valerie headers:
 * X-Valerie-Session: <session_id>
 * X-Valerie-Ts:      <unix seconds>
 * X-Valerie-Nonce:   <random hex, unique per request>
 * X-Valerie-Sig:     hex(HMAC_SHA256(key = session_key, message = `${ts}.${nonce}.` + rawBodyBytes))
 */
export function createSignedHeaders(sessionId: string, sessionKey: string, rawBody: string | Buffer): Record<string, string> {
  const ts = Math.floor(Date.now() / 1000).toString();
  const nonce = crypto.randomBytes(16).toString('hex');
  const bodyBuf = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody, 'utf8');
  const prefix = Buffer.from(`${ts}.${nonce}.`, 'utf8');
  const message = Buffer.concat([prefix, bodyBuf]);
  const sig = crypto.createHmac('sha256', sessionKey).update(message).digest('hex');

  return {
    'Content-Type': 'application/json',
    'X-Valerie-Session': sessionId,
    'X-Valerie-Ts': ts,
    'X-Valerie-Nonce': nonce,
    'X-Valerie-Sig': sig,
  };
}

/**
 * Client IP: use CF-Connecting-IP only when the request came through the tunnel
 * (socket address is 127.0.0.1 or ::1 and a cf-ray header is present). Otherwise use socket address.
 */
export function getClientIp(req: Request): string {
  const remoteAddr = req.socket?.remoteAddress || '';
  const isLoopback = (
    remoteAddr === '127.0.0.1' ||
    remoteAddr === '::1' ||
    remoteAddr === '::ffff:127.0.0.1'
  );
  const cfRay = req.headers['cf-ray'];
  const cfConnectingIp = req.headers['cf-connecting-ip'];

  if (isLoopback && cfRay && typeof cfConnectingIp === 'string') {
    return cfConnectingIp.split(',')[0].trim();
  }

  if (remoteAddr.startsWith('::ffff:')) {
    return remoteAddr.substring(7);
  }
  return remoteAddr || '127.0.0.1';
}

/**
 * Scanner paths:
 * /.env, /.git, /wp-admin, /wp-login.php, /phpmyadmin, /vendor/phpunit, /cgi-bin,
 * /actuator, /server-status, *.php, /backup, /admin.php
 */
export function isScannerPath(urlPath: string): boolean {
  const raw = urlPath.split('?')[0];
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    decoded = raw;
  }
  const p = decoded.toLowerCase();

  // Explicit scanner matches
  if (
    p.includes('/.env') || p === '/.env' ||
    p.includes('/.git') || p === '/.git' ||
    p.includes('/wp-admin') ||
    p.includes('/wp-login.php') ||
    p.includes('/phpmyadmin') ||
    p.includes('/vendor/phpunit') ||
    p.includes('/cgi-bin') ||
    p.includes('/actuator') ||
    p.includes('/server-status') ||
    p === '/backup' || p.startsWith('/backup/') || p.startsWith('/backup.') || p.includes('/backup') ||
    p === '/admin.php' || p.startsWith('/admin.php/') ||
    /\.php($|\/|\?)/i.test(p)
  ) {
    return true;
  }
  return false;
}

/**
 * Injection patterns in the URL, query or JSON string values:
 * ' or 1=1, union select, <script, ../, %2e%2e, ${jndi:, ; drop table, sleep(
 */
export function isInjectionValue(val: unknown): boolean {
  if (typeof val === 'string') {
    const lower = val.toLowerCase();
    if (/'\s*or\s+1\s*=\s*1/i.test(val)) return true;
    if (/union\s+select/i.test(val)) return true;
    if (/<script/i.test(val)) return true;
    if (val.includes('../')) return true;
    if (lower.includes('%2e%2e')) return true;
    if (lower.includes('${jndi:')) return true;
    if (/;\s*drop\s+table/i.test(val)) return true;
    if (/sleep\s*\(/i.test(val)) return true;
    return false;
  }
  if (typeof val === 'object' && val !== null) {
    for (const key of Object.keys(val)) {
      if (isInjectionValue(key)) return true;
      if (isInjectionValue((val as any)[key])) return true;
    }
  }
  return false;
}

export function isInjectionPattern(req: Request): boolean {
  // Check raw and decoded URL
  const rawUrl = req.originalUrl || req.url || '';
  if (isInjectionValue(rawUrl)) return true;
  try {
    const decodedUrl = decodeURIComponent(rawUrl);
    if (isInjectionValue(decodedUrl)) return true;
  } catch {}

  // Check query parameters
  if (req.query && isInjectionValue(req.query)) return true;

  // Check JSON body if parsed
  if (req.body && isInjectionValue(req.body)) return true;

  return false;
}

/**
 * More than 120 requests a minute from one IP -> flood
 */
export function checkFlood(ip: string): boolean {
  const now = Date.now();
  let record = ipFloodMap.get(ip);
  if (!record || now >= record.resetAt) {
    record = { count: 1, resetAt: now + 60000 };
    ipFloodMap.set(ip, record);
    return false;
  }
  record.count++;
  return record.count > 120;
}

/**
 * Enqueue event to be reported to Valerie
 */
export function queueEvent(event: GuardEvent) {
  eventQueue.push(event);
  // Cap queue size at 2000 to avoid runaway memory if Valerie is offline
  if (eventQueue.length > 2000) {
    eventQueue.splice(0, eventQueue.length - 2000);
  }
}

/**
 * Check if the request has a valid logged-in JWT session
 */
function isUserLoggedIn(req: Request): boolean {
  try {
    const authHeader = req.headers.authorization;
    const token = (authHeader && authHeader.startsWith('Bearer '))
      ? authHeader.substring(7).trim()
      : (typeof req.query?.token === 'string' ? req.query.token : null);

    if (!token) return false;
    jwt.verify(token, env.JWT_SECRET);
    return true;
  } catch {
    return false;
  }
}

/**
 * Flush events to Valerie (/prms/guard/report) every 10 s, at most 500 per batch.
 */
async function flushEvents() {
  if (eventQueue.length === 0) return;

  const sessionId = process.env.VALERIE_SESSION_ID;
  const sessionKey = process.env.VALERIE_SESSION_KEY;
  const baseUrl = (process.env.VALERIE_URL || 'https://ac2.tail6c723f.ts.net').replace(/\/+$/, '');

  if (!sessionId || !sessionKey) return;

  const batch = eventQueue.splice(0, 500);
  const bodyStr = JSON.stringify({ events: batch });

  try {
    const headers = createSignedHeaders(sessionId, sessionKey, bodyStr);
    const res = await fetch(`${baseUrl}/prms/guard/report`, {
      method: 'POST',
      headers,
      body: bodyStr,
    });

    if (res.status === 401) {
      handleSessionEnded();
      return;
    }

    if (res.ok) {
      const data = await res.json() as any;
      if (Array.isArray(data.blocked)) {
        for (const ip of data.blocked) {
          currentBlocks.add(ip);
        }
      }
    } else {
      // Put batch back if failed
      eventQueue.unshift(...batch);
    }
  } catch (err) {
    // If Valerie can't be reached, keep serving. Never crash.
    eventQueue.unshift(...batch);
  }
}

/**
 * Send /heartbeat every 15 s and replace local block list and lockdown flag with Valerie's answer.
 */
async function sendHeartbeat() {
  const sessionId = process.env.VALERIE_SESSION_ID;
  const sessionKey = process.env.VALERIE_SESSION_KEY;
  const baseUrl = (process.env.VALERIE_URL || 'https://ac2.tail6c723f.ts.net').replace(/\/+$/, '');

  if (!sessionId || !sessionKey) return;

  const bodyStr = JSON.stringify({ stats: { requests: totalRequestsCount } });

  try {
    const headers = createSignedHeaders(sessionId, sessionKey, bodyStr);
    const res = await fetch(`${baseUrl}/prms/guard/heartbeat`, {
      method: 'POST',
      headers,
      body: bodyStr,
    });

    if (res.status === 401) {
      handleSessionEnded();
      return;
    }

    if (res.ok) {
      const data = await res.json() as any;
      if (Array.isArray(data.blocks)) {
        currentBlocks = new Set(data.blocks);
      }
      isLockdown = !!data.lockdown;
    }
  } catch (err) {
    // If Valerie can't be reached, keep the last block list and keep serving. Never crash.
  }
}

/**
 * Handle Valerie ending session (401 response)
 */
function handleSessionEnded() {
  console.log('[ValerieGuard] Received 401 from Valerie: session ended. Cleaning up .valerie-session.json...');
  const sessionPath = path.resolve(process.cwd(), '.valerie-session.json');
  if (fs.existsSync(sessionPath)) {
    try {
      fs.unlinkSync(sessionPath);
    } catch {}
  }
  process.exit(0);
}

/**
 * Clean up old flood records periodically
 */
function cleanupFloodMap() {
  const now = Date.now();
  for (const [ip, rec] of ipFloodMap.entries()) {
    if (now >= rec.resetAt) {
      ipFloodMap.delete(ip);
    }
  }
}

/**
 * Start background tasks for Valerie Guard
 */
function ensureTimersStarted() {
  if (!flushTimer) {
    flushTimer = setInterval(flushEvents, 10000);
    flushTimer.unref?.();
  }
  if (!heartbeatTimer) {
    heartbeatTimer = setInterval(sendHeartbeat, 15000);
    heartbeatTimer.unref?.();
  }
  if (!cleanupTimer) {
    cleanupTimer = setInterval(cleanupFloodMap, 60000);
    cleanupTimer.unref?.();
  }
}

/**
 * Valerie Guard Middleware
 */
export function valerieGuard(req: Request, res: Response, next: NextFunction) {
  // If VALERIE_GUARD isn't 1, just call next()
  if (process.env.VALERIE_GUARD !== '1') {
    return next();
  }

  ensureTimersStarted();
  totalRequestsCount++;

  const clientIp = getClientIp(req);
  const now = Math.floor(Date.now() / 1000);
  const reqPath = req.originalUrl || req.url;

  // 1. IP in Valerie's block list -> banned_hit
  if (currentBlocks.has(clientIp)) {
    queueEvent({
      ip: clientIp,
      kind: 'banned_hit',
      path: reqPath,
      blocked: true,
      at: now,
    });
    return res.status(403).json({ error: 'Access denied' });
  }

  // 2. Scanner paths -> scanner
  if (isScannerPath(reqPath)) {
    queueEvent({
      ip: clientIp,
      kind: 'scanner',
      path: reqPath,
      blocked: true,
      at: now,
    });
    return res.status(403).json({ error: 'Forbidden' });
  }

  // 3. Injection patterns in URL, query or JSON string values -> injection
  if (isInjectionPattern(req)) {
    queueEvent({
      ip: clientIp,
      kind: 'injection',
      path: reqPath,
      blocked: true,
      at: now,
    });
    return res.status(403).json({ error: 'Forbidden' });
  }

  // 4. More than 120 requests a minute from one IP -> flood
  if (checkFlood(clientIp)) {
    queueEvent({
      ip: clientIp,
      kind: 'flood',
      path: reqPath,
      blocked: true,
      at: now,
    });
    return res.status(403).json({ error: 'Rate limit exceeded' });
  }

  // 5. Lockdown mode: only logged-in requests pass. Everything else gets 503
  if (isLockdown && !isUserLoggedIn(req)) {
    return res.status(503).json({ error: 'Temporarily locked down' });
  }

  // 6. Track failed logins: a 401 or 403 from the auth route -> report login_fail (Valerie decides blocking)
  const pathStr = req.path || (req.url ? req.url.split('?')[0] : '') || '';
  const isAuthPath = pathStr.startsWith('/auth') || pathStr.startsWith('/api/auth');
  if (isAuthPath) {
    res.on('finish', () => {
      if (res.statusCode === 401 || res.statusCode === 403) {
        queueEvent({
          ip: clientIp,
          kind: 'login_fail',
          path: reqPath,
          blocked: false,
          at: Math.floor(Date.now() / 1000),
        });
      }
    });
  }

  next();
}

import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import {
  valerieGuard,
  getClientIp,
  isScannerPath,
  isInjectionPattern,
  checkFlood,
  createSignedHeaders,
  resetGuardState,
  setBlocks,
  setLockdown,
  getEventQueue,
} from '../valerieGuard';
import { env } from '../../config';

describe('valerieGuard Middleware', () => {
  beforeEach(() => {
    resetGuardState();
    delete process.env.VALERIE_GUARD;
  });

  afterAll(() => {
    resetGuardState();
  });

  describe('Passthrough when VALERIE_GUARD is not 1', () => {
    it('calls next() immediately when VALERIE_GUARD is not enabled', () => {
      process.env.VALERIE_GUARD = '0';
      const req = { originalUrl: '/.env', socket: { remoteAddress: '127.0.0.1' }, headers: {} } as unknown as Request;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;
      const next = jest.fn();

      valerieGuard(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('Client IP Extraction', () => {
    it('uses CF-Connecting-IP when loopback and cf-ray is present', () => {
      const req = {
        socket: { remoteAddress: '127.0.0.1' },
        headers: {
          'cf-ray': '8123abc-SIN',
          'cf-connecting-ip': '203.0.113.195',
        },
      } as unknown as Request;

      expect(getClientIp(req)).toBe('203.0.113.195');
    });

    it('uses socket address when not loopback even if cf-connecting-ip is present', () => {
      const req = {
        socket: { remoteAddress: '198.51.100.5' },
        headers: {
          'cf-ray': '8123abc-SIN',
          'cf-connecting-ip': '203.0.113.195',
        },
      } as unknown as Request;

      expect(getClientIp(req)).toBe('198.51.100.5');
    });

    it('strips IPv6-mapped IPv4 prefix', () => {
      const req = {
        socket: { remoteAddress: '::ffff:192.168.1.50' },
        headers: {},
      } as unknown as Request;

      expect(getClientIp(req)).toBe('192.168.1.50');
    });
  });

  describe('Scanner Path Detection', () => {
    const scannerPaths = [
      '/.env',
      '/.env.local',
      '/.git',
      '/.git/config',
      '/wp-admin',
      '/wp-login.php',
      '/phpmyadmin',
      '/vendor/phpunit',
      '/cgi-bin',
      '/actuator',
      '/server-status',
      '/test.php',
      '/index.php',
      '/backup',
      '/backup/db.sql',
      '/admin.php',
    ];

    scannerPaths.forEach((path) => {
      it(`detects scanner path: ${path}`, () => {
        expect(isScannerPath(path)).toBe(true);
      });
    });

    it('does not flag normal PRMS paths', () => {
      expect(isScannerPath('/properties')).toBe(false);
      expect(isScannerPath('/api/auth/login')).toBe(false);
      expect(isScannerPath('/admin/dashboard')).toBe(false);
      expect(isScannerPath('/uploads/properties/photo.jpg')).toBe(false);
    });
  });

  describe('Injection Pattern Detection', () => {
    it('detects SQL injection in query params', () => {
      const req = {
        originalUrl: '/properties?id=1',
        query: { id: "' or 1=1" },
      } as unknown as Request;

      expect(isInjectionPattern(req)).toBe(true);
    });

    it('detects union select in url', () => {
      const req = {
        originalUrl: '/properties?search=union%20select',
        query: {},
      } as unknown as Request;

      expect(isInjectionPattern(req)).toBe(true);
    });

    it('detects <script in body', () => {
      const req = {
        originalUrl: '/messages',
        query: {},
        body: { content: '<script>alert(1)</script>' },
      } as unknown as Request;

      expect(isInjectionPattern(req)).toBe(true);
    });

    it('detects directory traversal ../ and %2e%2e', () => {
      const req1 = { originalUrl: '/files/../../etc/passwd' } as unknown as Request;
      const req2 = { originalUrl: '/files/%2e%2e/config' } as unknown as Request;

      expect(isInjectionPattern(req1)).toBe(true);
      expect(isInjectionPattern(req2)).toBe(true);
    });

    it('detects jndi and drop table and sleep patterns', () => {
      const req1 = { body: { user: '${jndi:ldap://evil}' } } as unknown as Request;
      const req2 = { originalUrl: '/search?id=1; drop table users' } as unknown as Request;
      const req3 = { query: { q: 'sleep(5)' } } as unknown as Request;

      expect(isInjectionPattern(req1)).toBe(true);
      expect(isInjectionPattern(req2)).toBe(true);
      expect(isInjectionPattern(req3)).toBe(true);
    });
  });

  describe('Flood Rate Limiting', () => {
    it('allows under 120 requests and flags over 120 from one IP in a minute', () => {
      const testIp = '10.0.0.99';
      for (let i = 0; i < 120; i++) {
        expect(checkFlood(testIp)).toBe(false);
      }
      // 121st request should be detected as flood
      expect(checkFlood(testIp)).toBe(true);
    });
  });

  describe('Signed Headers HMAC-SHA256 Generation', () => {
    it('produces required X-Valerie headers with correct format', () => {
      const sessionId = 'valerie-test-session';
      const sessionKey = 'super-secret-key-1234';
      const body = JSON.stringify({ stats: { requests: 42 } });

      const headers = createSignedHeaders(sessionId, sessionKey, body);

      expect(headers['X-Valerie-Session']).toBe(sessionId);
      expect(headers['X-Valerie-Ts']).toBeDefined();
      expect(headers['X-Valerie-Nonce']).toBeDefined();
      expect(headers['X-Valerie-Sig']).toBeDefined();
      expect(headers['X-Valerie-Sig'].length).toBe(64); // SHA-256 hex length
    });
  });

  describe('Guard Blocking Actions in Active Mode', () => {
    beforeEach(() => {
      process.env.VALERIE_GUARD = '1';
    });

    it('blocks banned IPs with 403 and records banned_hit event', () => {
      setBlocks(['198.51.100.99']);

      const req = {
        socket: { remoteAddress: '198.51.100.99' },
        headers: {},
        originalUrl: '/properties',
      } as unknown as Request;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;
      const next = jest.fn();

      valerieGuard(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();

      const events = getEventQueue();
      expect(events.length).toBe(1);
      expect(events[0].kind).toBe('banned_hit');
      expect(events[0].blocked).toBe(true);
      expect(events[0].ip).toBe('198.51.100.99');
    });

    it('blocks scanner paths with 403 and records scanner event', () => {
      const req = {
        socket: { remoteAddress: '198.51.100.10' },
        headers: {},
        originalUrl: '/.env',
      } as unknown as Request;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;
      const next = jest.fn();

      valerieGuard(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();

      const events = getEventQueue();
      expect(events.length).toBe(1);
      expect(events[0].kind).toBe('scanner');
      expect(events[0].blocked).toBe(true);
    });

    it('blocks injection patterns with 403 and records injection event', () => {
      const req = {
        socket: { remoteAddress: '198.51.100.11' },
        headers: {},
        originalUrl: "/properties?id=1' or 1=1",
        query: { id: "' or 1=1" },
      } as unknown as Request;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;
      const next = jest.fn();

      valerieGuard(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();

      const events = getEventQueue();
      expect(events.length).toBe(1);
      expect(events[0].kind).toBe('injection');
      expect(events[0].blocked).toBe(true);
    });

    it('blocks unauthenticated requests in lockdown mode with 503', () => {
      setLockdown(true);

      const req = {
        socket: { remoteAddress: '198.51.100.12' },
        headers: {},
        originalUrl: '/properties',
      } as unknown as Request;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;
      const next = jest.fn();

      valerieGuard(req, res, next);

      expect(res.status).toHaveBeenCalledWith(503);
      expect(next).not.toHaveBeenCalled();
    });

    it('allows authenticated requests in lockdown mode', () => {
      setLockdown(true);

      const validToken = jwt.sign({ userId: 'user-123' }, env.JWT_SECRET);
      const req = {
        socket: { remoteAddress: '198.51.100.12' },
        headers: {
          authorization: `Bearer ${validToken}`,
        },
        originalUrl: '/properties',
        query: {},
      } as unknown as Request;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn(), on: jest.fn() } as unknown as Response;
      const next = jest.fn();

      valerieGuard(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});

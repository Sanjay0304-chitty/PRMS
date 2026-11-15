import http from 'node:http';
import { isIP } from 'node:net';

export function validateSchedule(schedule) {
  if (!schedule || schedule.timeZone !== 'Asia/Kuala_Lumpur' || !Array.isArray(schedule.windows) || !schedule.windows.length) throw new Error('A Malaysia-time demo schedule is required.');
  let previousEnd = 0;
  for (const window of schedule.windows) {
    const start = Date.parse(window.start), end = Date.parse(window.end);
    if (!window.start?.endsWith('+08:00') || !window.end?.endsWith('+08:00') || !Number.isFinite(start) || !Number.isFinite(end) || start >= end || start < previousEnd) throw new Error('Demo windows must use +08:00, be ordered, and not overlap.');
    previousEnd = end;
  }
  return schedule;
}

export function demoState(schedule, now = Date.now()) {
  const current = schedule.windows.find(window => now >= Date.parse(window.start) && now < Date.parse(window.end));
  return { open: !!current, current, next: schedule.windows.find(window => Date.parse(window.start) > now), finished: now >= Date.parse(schedule.windows.at(-1).end) };
}

function closedPage(schedule, finished) {
  const date = new Intl.DateTimeFormat('en-MY', { timeZone: schedule.timeZone, day: 'numeric', month: 'long', year: 'numeric' });
  const time = new Intl.DateTimeFormat('en-MY', { timeZone: schedule.timeZone, hour: 'numeric', minute: '2-digit', hour12: true });
  const windows = schedule.windows.map(window => `<li><strong>${date.format(new Date(window.start))}</strong><span>${time.format(new Date(window.start))} – ${time.format(new Date(window.end))}</span></li>`).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PRMS · Demo availability</title><style>body{margin:0;min-height:100dvh;display:grid;place-items:center;background:#0f172a;color:#f8fafc;font:16px/1.6 system-ui,sans-serif}main{box-sizing:border-box;width:min(580px,100%);padding:32px 24px}header{color:#c084fc;font-size:24px;font-weight:800}h1{font-size:32px;line-height:1.2}p{color:#cbd5e1}ul{padding:0;list-style:none}li{display:flex;flex-wrap:wrap;justify-content:space-between;gap:8px;padding:14px 0;border-bottom:1px solid #334155}small{color:#cbd5e1}</style></head><body><main><header>PRMS</header><h1>${finished ? 'This demo has ended.' : 'The demo is currently closed.'}</h1><p>${finished ? 'Thank you for reviewing our project.' : 'Please return during one of the scheduled viewing sessions.'}</p><ul>${windows}</ul><small>All times are Malaysia time (UTC+8). Contact the project team if you need help.</small></main></body></html>`;
}

const hopHeaders = ['connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization', 'te', 'trailer', 'transfer-encoding', 'upgrade'];
function forwardedHeaders(headers) {
  const result = { ...headers };
  for (const header of String(headers.connection || '').split(',')) delete result[header.trim().toLowerCase()];
  for (const header of hopHeaders) delete result[header];
  return result;
}

export function createDemoGate({ schedule, upstreamPort, now = Date.now }) {
  validateSchedule(schedule);
  const active = new Set();
  const server = http.createServer((req, res) => {
    const state = demoState(schedule, now());
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (!state.open) {
      res.statusCode = 503;
      if (state.next) res.setHeader('Retry-After', String(Math.max(1, Math.ceil((Date.parse(state.next.start) - now()) / 1000))));
      const json = req.url?.startsWith('/api/') || req.headers.accept?.includes('application/json') || !['GET', 'HEAD'].includes(req.method);
      res.setHeader('Content-Type', json ? 'application/json; charset=utf-8' : 'text/html; charset=utf-8');
      res.end(req.method === 'HEAD' ? undefined : json ? JSON.stringify({ success: false, error: { message: 'The PRMS demo is closed outside its scheduled Malaysia-time sessions.' } }) : closedPage(schedule, state.finished));
      return;
    }
    // Only the origin port below is reachable; never proxy a client-supplied URL.
    const headers = forwardedHeaders(req.headers);
    // Cloudflare supplies this value. Never trust a visitor's forwarded chain.
    const clientIp = req.headers['cf-connecting-ip'];
    headers['x-forwarded-for'] = typeof clientIp === 'string' && isIP(clientIp) ? clientIp : req.socket.remoteAddress;
    headers['x-forwarded-proto'] = 'https';
    const upstream = http.request({ host: '127.0.0.1', port: upstreamPort, method: req.method, path: req.url, headers }, response => {
      res.writeHead(response.statusCode || 502, { ...forwardedHeaders(response.headers), 'cache-control': 'no-store, max-age=0', 'x-robots-tag': 'noindex, nofollow, noarchive' });
      response.pipe(res);
    });
    const connection = { upstream, res };
    active.add(connection);
    res.on('close', () => { active.delete(connection); upstream.destroy(); });
    req.on('aborted', () => upstream.destroy());
    upstream.on('error', () => {
      active.delete(connection);
      if (!res.headersSent) { res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('The demo server is starting or unavailable. Please try again shortly.'); }
      else res.destroy();
    });
    req.pipe(upstream);
  });
  // Close long-running responses when a session ends; every new request is also checked.
  const timer = setInterval(() => {
    if (!demoState(schedule, now()).open) for (const connection of active) { connection.upstream.destroy(); connection.res.destroy(); active.delete(connection); }
  }, 1000);
  timer.unref();
  server.on('close', () => { clearInterval(timer); for (const connection of active) { connection.upstream.destroy(); connection.res.destroy(); } });
  return server;
}

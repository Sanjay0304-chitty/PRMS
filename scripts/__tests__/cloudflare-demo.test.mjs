import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { readFileSync } from 'node:fs';
import { createDemoGate, demoState, validateSchedule } from '../cloudflare-demo-gate.mjs';

const schedule = JSON.parse(readFileSync(new URL('../demo-schedule.json', import.meta.url), 'utf8'));
test('Malaysia-time sessions open at the start and close exactly at the end', () => {
  validateSchedule(schedule);
  for (const window of schedule.windows) {
    assert.equal(demoState(schedule, Date.parse(window.start) - 1).open, false);
    assert.equal(demoState(schedule, Date.parse(window.start)).open, true);
    assert.equal(demoState(schedule, Date.parse(window.end) - 1).open, true);
    assert.equal(demoState(schedule, Date.parse(window.end)).open, false);
  }
  assert.equal(demoState(schedule, Date.parse('2026-11-13T10:00:00Z')).open, true);
  assert.equal(demoState(schedule, Date.parse('2026-11-15T10:00:00Z')).finished, true);
});
test('invalid or overlapping schedules fail closed', () => {
  assert.throws(() => validateSchedule({ ...schedule, windows: [] }));
  assert.throws(() => validateSchedule({ ...schedule, windows: [{ start: 'bad', end: 'bad' }] }));
  assert.throws(() => validateSchedule({ ...schedule, windows: [schedule.windows[0], schedule.windows[0]] }));
});
async function listen(server) {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return server.address().port;
}
async function close(server) {
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
}
test('closed gateway blocks HTML, API, images and writes without reaching the origin', async () => {
  let hits = 0;
  const origin = http.createServer((_req, res) => { hits++; res.end('unexpected'); });
  const originPort = await listen(origin);
  const gate = createDemoGate({ schedule, upstreamPort: originPort, now: () => Date.parse('2026-11-13T17:59:59+08:00') });
  const port = await listen(gate);
  try {
    for (const [url, method] of [['/', 'GET'], ['/api/properties', 'GET'], ['/images/photo.png', 'GET'], ['/auth/login', 'POST']]) {
      const response = await fetch(`http://127.0.0.1:${port}${url}`, { method });
      assert.equal(response.status, 503);
      assert.equal(response.headers.get('cache-control'), 'no-store, max-age=0');
      assert.ok(response.headers.has('retry-after'));
      assert.ok((await response.text()).includes('demo'));
    }
    assert.equal(hits, 0);
  } finally { await close(gate); await close(origin); }
});
test('open gateway forwards requests and closes access on the next request after cutoff', async () => {
  let now = Date.parse(schedule.windows[0].start), hits = 0;
  const origin = http.createServer((req, res) => {
    hits++;
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => { res.setHeader('Cache-Control', 'public, max-age=1000'); res.end(JSON.stringify({ body, url: req.url, client: req.headers['x-forwarded-for'] })); });
  });
  const gate = createDemoGate({ schedule, upstreamPort: await listen(origin), now: () => now });
  const port = await listen(gate);
  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/example?q=test`, { method: 'POST', headers: { 'cf-connecting-ip': '203.0.113.10', 'x-forwarded-for': 'spoofed' }, body: 'hello' });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { body: 'hello', url: '/api/example?q=test', client: '203.0.113.10' });
    assert.equal(response.headers.get('cache-control'), 'no-store, max-age=0');
    now = Date.parse(schedule.windows[0].end);
    assert.equal((await fetch(`http://127.0.0.1:${port}/api/example`)).status, 503);
    assert.equal(hits, 1);
  } finally { await close(gate); await close(origin); }
});

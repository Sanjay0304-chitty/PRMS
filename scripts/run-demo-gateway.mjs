import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDemoGate, validateSchedule } from './cloudflare-demo-gate.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const scheduleFile = path.join(root, 'scripts/demo-schedule.json');
const testStart = Date.now();
const testWindow = process.argv.includes('--test-hour')
  ? { start: testStart, end: testStart + 3600000 } : null;
const localDate = value => new Date(value + 8 * 3600000).toISOString().replace('Z', '+08:00');

function loadSchedule() {
  const approved = validateSchedule(JSON.parse(fs.readFileSync(scheduleFile, 'utf8')));
  if (!testWindow) return approved;
  const intervals = [...approved.windows.map(window => ({ start: Date.parse(window.start), end: Date.parse(window.end) })), testWindow].sort((a, b) => a.start - b.start);
  const merged = [];
  for (const interval of intervals) {
    const previous = merged.at(-1);
    if (previous && interval.start <= previous.end) previous.end = Math.max(previous.end, interval.end);
    else merged.push({ ...interval });
  }
  return validateSchedule({ ...approved, windows: merged.map(window => ({ start: localDate(window.start), end: localDate(window.end) })) });
}

try {
  const schedule = loadSchedule();
  const server = createDemoGate({ schedule, upstreamPort: 3510 });
  let timer;
  const stop = () => { clearInterval(timer); server.closeAllConnections(); server.close(); };
  server.on('error', error => { console.error(`Gateway could not start: ${error.code || error.message}`); stop(); process.exitCode = 1; });
  server.listen(3511, '127.0.0.1', () => {
    console.log('Scheduled gateway ready on http://127.0.0.1:3511');
    if (testWindow) console.log(`One-hour test window closes at ${new Date(testWindow.end).toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' })} Malaysia time.`);
    console.log('Configured client sessions remain available. Keep this terminal open; Ctrl+C stops the gateway.');
    timer = setInterval(() => {
      try { schedule.windows = loadSchedule().windows; }
      catch { console.error('Schedule is invalid or unreadable. Stopping access.'); stop(); process.exitCode = 1; }
    }, 1000);
  });
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}

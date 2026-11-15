import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { createDemoGate, demoState, validateSchedule } from './cloudflare-demo-gate.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const backend = path.join(root, 'prms-backend');
const frontend = path.join(root, 'prms-frontend');
const require = createRequire(path.join(backend, 'package.json'));
require('dotenv').config({ path: path.join(backend, '.env'), quiet: true });
const schedule = validateSchedule(JSON.parse(fs.readFileSync(path.join(root, 'scripts/demo-schedule.json'), 'utf8')));
const originPort = 3510, gatePort = 3511;
const stateDirectory = path.join(root, '.artifacts/cloudflare-demo');
const children = new Set();
let gate, stopTimer, stopping = false, ownsStatus = false;

function start(command, args, options = {}) {
  const child = spawn(command, args, { windowsHide: true, stdio: 'inherit', ...options });
  children.add(child);
  child.once('error', error => { console.error(`[Demo] Cannot start process: ${error.code || 'unknown error'}`); shutdown(1); });
  child.once('exit', () => children.delete(child));
  return child;
}
async function runNode(script, args, cwd, env = process.env) {
  await new Promise((resolve, reject) => {
    const child = start(process.execPath, [script, ...args], { cwd, env });
    child.once('error', reject);
    child.once('exit', code => code === 0 ? resolve() : reject(new Error(`Setup process exited with code ${code}.`)));
  });
}
async function requireFreePort(port) {
  await new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once('error', () => reject(new Error(`Port ${port} is busy. Stop the previous demo before restarting.`)));
    probe.listen(port, '127.0.0.1', () => probe.close(resolve));
  });
}
function shutdown(code = 0) {
  if (stopping) return;
  stopping = true;
  clearInterval(stopTimer);
  gate?.closeAllConnections();
  gate?.close();
  for (const child of children) child.kill();
  if (ownsStatus) fs.writeFileSync(path.join(stateDirectory, 'status.json'), JSON.stringify({ running: false, stoppedAt: new Date().toISOString() }));
  console.log('[Demo] Public preview stopped. MySQL and your development servers are unchanged.');
  setTimeout(() => process.exit(code), 500).unref();
}
process.on('SIGINT', () => shutdown());
process.on('SIGTERM', () => shutdown());

async function main() {
  if (demoState(schedule).finished) throw new Error('The scheduled demo has ended. Review scripts/demo-schedule.json before a new session.');
  await requireFreePort(originPort);
  await requireFreePort(gatePort);
  console.log('[Demo] Checking local MySQL...');
  await runNode(path.join(backend, 'scripts/local-mysql.cjs'), ['start'], backend);
  {
    console.log('[Demo] Building the frontend for the public URL...');
    await runNode(path.join(frontend, 'node_modules/vite/bin/vite.js'), ['build'], frontend, { ...process.env, VITE_API_BASE_URL: '' });
    console.log('[Demo] Building the backend...');
    await runNode(path.join(backend, 'node_modules/typescript/bin/tsc'), [], backend);
  }
  if (!fs.existsSync(path.join(frontend, 'dist/index.html'))) throw new Error('Build the frontend before starting the demo.');
  const app = start(process.execPath, [path.join(backend, 'dist/app.js')], { cwd: backend, env: { ...process.env, PORT: String(originPort), NODE_ENV: 'production', DEMO_LOOPBACK_ONLY: 'true' }, stdio: ['ignore', 'pipe', 'pipe'] });
  app.stdout.on('data', data => process.stdout.write(data));
  app.stderr.on('data', data => process.stderr.write(data));
  app.once('exit', code => { if (!stopping) shutdown(code || 1); });
  let ready = false;
  for (let attempt = 0; attempt < 40 && !stopping; attempt++) {
    try {
      const response = await fetch(`http://127.0.0.1:${originPort}/health`, { signal: AbortSignal.timeout(1000) });
      if (response.ok) { ready = true; break; }
    } catch { /* Wait for the local origin to start. */ }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  if (!ready) throw new Error('The local demo backend did not become ready.');
  gate = createDemoGate({ schedule, upstreamPort: originPort });
  await new Promise((resolve, reject) => { gate.once('error', reject); gate.listen(gatePort, '127.0.0.1', resolve); });
  fs.mkdirSync(stateDirectory, { recursive: true });
  ownsStatus = true;
  fs.writeFileSync(path.join(stateDirectory, 'stop-request.json'), '{}');
  console.log('[Demo] Public access is restricted to the configured Malaysia-time windows.');
  console.log('[Demo] 13 Nov 2026: 6–10 PM; 14 and 15 Nov: 2–6 PM. Keep this terminal and PC running. Ctrl+C stops the preview.');
  const installed = path.join(process.env['ProgramFiles(x86)'] || 'C:/Program Files (x86)', 'cloudflared/cloudflared.exe');
  const executable = process.env.CLOUDFLARED_PATH || (fs.existsSync(installed) ? installed : 'cloudflared');
  const tunnel = start(executable, ['tunnel', '--no-autoupdate', '--url', `http://127.0.0.1:${gatePort}`], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
  function output(data) {
    const text = data.toString();
    process.stdout.write(text);
    const url = text.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/)?.[0];
    if (url) {
      fs.writeFileSync(path.join(stateDirectory, 'status.json'), JSON.stringify({ running: true, url, pid: process.pid, originPort, gatePort, schedule }, null, 2));
      console.log(`\n[Demo] Client link: ${url}\n[Demo] Outside viewing hours this link shows the closed page.\n`);
    }
  }
  tunnel.stdout.on('data', output);
  tunnel.stderr.on('data', output);
  tunnel.once('exit', code => { if (!stopping) shutdown(code || 1); });
  stopTimer = setInterval(() => {
    try {
      const updated = validateSchedule(JSON.parse(fs.readFileSync(path.join(root, 'scripts/demo-schedule.json'), 'utf8')));
      if (JSON.stringify(updated) !== JSON.stringify(schedule)) {
        schedule.windows = updated.windows;
        const statusFile = path.join(stateDirectory, 'status.json');
        const status = JSON.parse(fs.readFileSync(statusFile, 'utf8'));
        if (status.pid === process.pid && status.running) fs.writeFileSync(statusFile, JSON.stringify({ ...status, schedule }, null, 2));
        console.log('[Demo] Updated viewing schedule loaded.');
      }
    } catch {
      console.error('[Demo] Invalid or unreadable schedule; stopping public access.');
      shutdown(1);
      return;
    }
    const requestFile = path.join(stateDirectory, 'stop-request.json');
    let stopRequested = false;
    try { stopRequested = JSON.parse(fs.readFileSync(requestFile, 'utf8')).pid === process.pid; } catch { /* No stop request. */ }
    if (stopRequested || demoState(schedule).finished) shutdown();
  }, 1000);
}
main().catch(error => { console.error(`[Demo] ${error.message}`); shutdown(1); });

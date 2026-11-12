#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import crypto from 'node:crypto';
import { spawn, execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const sessionFilePath = path.join(rootDir, '.valerie-session.json');
const VALERIE_URL = (process.env.VALERIE_URL || 'https://ac2.tail6c723f.ts.net').replace(/\/+$/, '');

function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans.trim());
    });
  });
}

function createSignedHeaders(sessionId, sessionKey, rawBody) {
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

async function isValerieReachable() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`${VALERIE_URL}/prms/guard/session`, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return res.status !== 0;
  } catch (err) {
    return false;
  }
}

async function isSavedSessionValid(sessionId, sessionKey) {
  try {
    const bodyStr = JSON.stringify({ stats: { requests: 0 } });
    const headers = createSignedHeaders(sessionId, sessionKey, bodyStr);
    const res = await fetch(`${VALERIE_URL}/prms/guard/heartbeat`, {
      method: 'POST',
      headers,
      body: bodyStr,
      signal: AbortSignal.timeout(4000),
    });
    if (res.status === 401) return 'expired';
    return res.ok ? 'valid' : 'unreachable';
  } catch {
    return 'unreachable';
  }
}

async function main() {
  let sessionId = null;
  let sessionKey = null;
  let isUnguarded = false;

  // 1. Session check or exchange
  if (fs.existsSync(sessionFilePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(sessionFilePath, 'utf8'));
      if (data.session_id && data.session_key) {
        const status = await isSavedSessionValid(data.session_id, data.session_key);
        if (status === 'valid') {
          sessionId = data.session_id;
          sessionKey = data.session_key;
          console.log(`[Valerie Guard] Resuming existing session: ${sessionId}`);
        } else if (status === 'expired') {
          console.warn('[Valerie Guard] Saved session expired (401). Removing stale session file...');
          try { fs.unlinkSync(sessionFilePath); } catch {}
        } else {
          console.warn('[Valerie Guard] Saved session found, but Valerie is currently unreachable.');
        }
      }
    } catch (e) {
      console.warn('[Valerie Guard] Failed to parse .valerie-session.json, requesting fresh code...');
    }
  }

  if (!sessionId || !sessionKey) {
    const reachable = await isValerieReachable();
    if (!reachable) {
      console.warn(`[Valerie Guard] Valerie is currently unreachable at ${VALERIE_URL}`);
      const answer = await askQuestion('Host without Valerie? (y/N): ');
      if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
        console.log('Exiting.');
        process.exit(0);
      }
      isUnguarded = true;
      console.log('[Valerie Guard] Hosting in unguarded mode (local rate limits only).');
    } else {
      const code = await askQuestion('Enter 6-digit Valerie code: ');
      if (!code) {
        console.error('No code entered. Exiting.');
        process.exit(1);
      }

      console.log('[Valerie Guard] Checking the code with Valerie...');
      try {
        const res = await fetch(`${VALERIE_URL}/prms/guard/session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok || !data.ok) {
          const errMsg = data.error || res.statusText || `HTTP ${res.status}`;
          console.error(`[Valerie Guard] Session request rejected (${res.status}): ${errMsg}`);
          process.exit(1);
        }

        sessionId = data.session_id;
        sessionKey = data.session_key;

        // Persist session with 0600 mode
        fs.writeFileSync(
          sessionFilePath,
          JSON.stringify({ session_id: sessionId, session_key: sessionKey }, null, 2),
          { mode: 0o600 }
        );
        try {
          fs.chmodSync(sessionFilePath, 0o600);
        } catch {}

        console.log(`[Valerie Guard] Session established: ${sessionId}`);
      } catch (err) {
        console.error('[Valerie Guard] Network error requesting session:', err.message);
        process.exit(1);
      }
    }
  }

  // 2. Build frontend for single-origin serving
  console.log('\n[PRMS Host] Building prms-frontend (npm run build)...');
  try {
    execSync('npm run build', {
      cwd: path.join(rootDir, 'prms-frontend'),
      stdio: 'inherit',
    });
    console.log('[PRMS Host] Frontend build ready.');
  } catch (err) {
    console.error('[PRMS Host] Frontend build failed:', err.message);
    process.exit(1);
  }

  // 3. Start PRMS backend on port 3500
  console.log('\n[PRMS Host] Starting backend server on port 3500...');
  const backendEnv = {
    ...process.env,
    PORT: '3500',
    VALERIE_GUARD: isUnguarded ? '0' : '1',
    VALERIE_URL: VALERIE_URL,
    VALERIE_SESSION_ID: sessionId || '',
    VALERIE_SESSION_KEY: sessionKey || '',
    VALERIE_SESSION_FILE: sessionFilePath,
  };

  const backend = spawn('npx', ['tsx', 'src/app.ts'], {
    cwd: path.join(rootDir, 'prms-backend'),
    env: backendEnv,
    shell: process.platform === 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  backend.stdout.on('data', (d) => process.stdout.write(`[backend] ${d}`));
  backend.stderr.on('data', (d) => process.stderr.write(`[backend] ${d}`));

  backend.on('error', (err) => {
    console.error(`[PRMS Host] Failed to start backend process: ${err.message}`);
    cleanupAndExit(1);
  });

  backend.on('exit', (code) => {
    console.log(`[PRMS Host] Backend process exited with code ${code}`);
    cleanupAndExit(code || 0);
  });

  // 4. Start Cloudflare Tunnel
  console.log('[PRMS Host] Starting Cloudflare Quick Tunnel...');
  const pathSep = process.platform === 'win32' ? ';' : ':';
  const cloudflaredEnv = {
    ...process.env,
    PATH: `/opt/homebrew/bin${pathSep}/usr/local/bin${pathSep}${process.env.PATH || ''}`,
  };

  const cloudflared = spawn('cloudflared', ['tunnel', '--url', 'http://localhost:3500'], {
    env: cloudflaredEnv,
    shell: process.platform === 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let liveReported = false;
  let tunnelUrl = '';
  const startedAt = Math.floor(Date.now() / 1000);
  let retryInterval = null;

  async function onTunnelUrlFound(url) {
    tunnelUrl = url;
    console.log('\n=============================================================');
    console.log(` PRMS IS LIVE AT: ${tunnelUrl}`);
    console.log('=============================================================\n');

    if (!isUnguarded && sessionId && sessionKey) {
      try {
        const bodyStr = JSON.stringify({ url: tunnelUrl });
        const headers = createSignedHeaders(sessionId, sessionKey, bodyStr);
        const res = await fetch(`${VALERIE_URL}/prms/guard/live`, {
          method: 'POST',
          headers,
          body: bodyStr,
        });

        if (res.status === 401) {
          console.error('[Valerie Guard] 401 Unknown session. Removing session file and stopping.');
          try { fs.unlinkSync(sessionFilePath); } catch {}
          cleanupAndExit(0);
          return;
        }

        if (res.ok) {
          console.log('[Valerie Guard] Live status announced to Valerie. Security guard is ACTIVE.');
          console.log('[Valerie Guard] Alerts are armed for Adrian (Telegram) and Sanjay (WhatsApp).');
        } else {
          console.warn(`[Valerie Guard] Live announcement returned status ${res.status}`);
        }
      } catch (err) {
        console.warn('[Valerie Guard] Failed to announce live URL to Valerie:', err.message);
      }
    } else if (isUnguarded) {
      // In unguarded mode: retry Valerie every 60 s
      console.log('[Valerie Guard] Running in unguarded mode. Retrying Valerie every 60s...');
      retryInterval = setInterval(async () => {
        const reachable = await isValerieReachable();
        if (reachable) {
          try {
            const bodyStr = JSON.stringify({ url: tunnelUrl, started: startedAt });
            const res = await fetch(`${VALERIE_URL}/prms/guard/unguarded`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: bodyStr,
            });
            if (res.ok) {
              console.log('\n[Valerie Guard] Valerie is back online! Notified POST /unguarded.');
              console.log('[Valerie Guard] Sanjay, please message "host prms" to Valerie to enable guard.\n');
              clearInterval(retryInterval);
              retryInterval = null;
            }
          } catch (e) {}
        }
      }, 60000);
      retryInterval.unref?.();
    }
  }

  function handleCloudflaredOutput(chunk) {
    const text = chunk.toString();
    process.stdout.write(`[cloudflared] ${text}`);

    if (!liveReported) {
      const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
      if (match) {
        liveReported = true;
        onTunnelUrlFound(match[0]);
      }
    }
  }

  cloudflared.stdout.on('data', handleCloudflaredOutput);
  cloudflared.stderr.on('data', handleCloudflaredOutput);

  cloudflared.on('error', (err) => {
    console.error(`[PRMS Host] Failed to launch cloudflared (${err.message}). Make sure cloudflared is installed.`);
    cleanupAndExit(1);
  });

  cloudflared.on('exit', (code) => {
    console.log(`[PRMS Host] Cloudflared process exited with code ${code}`);
    cleanupAndExit(code || 0);
  });

  // Stop a child and everything it started. On Windows the children run through a shell, so kill() only stopped
  // the shell and cloudflared / the backend kept running - taskkill /T stops the whole tree.
  function stopChild(child) {
    if (!child || child.exitCode !== null) return;
    if (process.platform === 'win32' && child.pid) {
      try { execSync(`taskkill /pid ${child.pid} /T /F`, { stdio: 'ignore' }); return; } catch {}
    }
    if (!child.killed) child.kill('SIGTERM');
  }

  // 5. Clean shutdown handler
  let shuttingDown = false;
  async function cleanupAndExit(code = 0) {
    if (shuttingDown) return;
    shuttingDown = true;

    if (retryInterval) {
      clearInterval(retryInterval);
      retryInterval = null;
    }

    console.log('\n[PRMS Host] Shutting down cleanly...');

    // On Ctrl+C, call POST /pause if we had an active guard session. If the session was ended in Valerie
    // ("end prms"), the backend has already removed .valerie-session.json - say so instead of "preserved".
    if (!isUnguarded && sessionId && sessionKey) {
      if (!fs.existsSync(sessionFilePath)) {
        console.log('[Valerie Guard] The session was ended in Valerie ("end prms"). Ask Valerie for a new code next time.');
      } else {
        try {
          const bodyStr = JSON.stringify({});
          const headers = createSignedHeaders(sessionId, sessionKey, bodyStr);
          const res = await fetch(`${VALERIE_URL}/prms/guard/pause`, {
            method: 'POST',
            headers,
            body: bodyStr,
            signal: AbortSignal.timeout(3000),
          });
          if (res.ok) {
            console.log('[Valerie Guard] Paused. The session is kept - run this script again to restart (no new code needed).');
          } else if (res.status === 401) {
            try { fs.unlinkSync(sessionFilePath); } catch {}
            console.log('[Valerie Guard] The session was ended in Valerie ("end prms"). Ask Valerie for a new code next time.');
          } else {
            console.warn(`[Valerie Guard] Pause call answered ${res.status}.`);
          }
        } catch (err) {
          console.warn('[Valerie Guard] Pause call failed:', err.message);
        }
      }
    }

    stopChild(cloudflared);
    stopChild(backend);

    // Keep .valerie-session.json intact on regular stop
    setTimeout(() => process.exit(code), 500);
  }

  process.on('SIGINT', () => cleanupAndExit(0));
  process.on('SIGTERM', () => cleanupAndExit(0));
}

main().catch((err) => {
  console.error('[PRMS Host] Uncaught error:', err);
  process.exit(1);
});

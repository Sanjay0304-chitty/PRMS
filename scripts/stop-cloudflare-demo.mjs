import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const directory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.artifacts/cloudflare-demo');
try {
  const status = JSON.parse(fs.readFileSync(path.join(directory, 'status.json'), 'utf8'));
  if (!status.running || !Number.isInteger(status.pid)) {
    console.log('The Cloudflare demo is not running.');
  } else {
    fs.writeFileSync(path.join(directory, 'stop-request.json'), JSON.stringify({ pid: status.pid, requestedAt: new Date().toISOString() }));
    console.log('Requested demo shutdown. The preview will stop within a few seconds.');
  }
} catch (error) {
  if (error.code === 'ENOENT') console.log('No running demo status was found.');
  else { console.error('Unable to request demo shutdown.'); process.exitCode = 1; }
}

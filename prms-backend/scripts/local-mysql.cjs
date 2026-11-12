const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const mysql = require('mysql2/promise');
const directory = path.resolve(__dirname, '../../.artifacts/local-mysql');
async function connect() {
  const credentials = JSON.parse(fs.readFileSync(path.join(directory, 'credentials.json'), 'utf8'));
  return mysql.createConnection({ host: '127.0.0.1', port: 3307, user: 'root', password: credentials.rootPassword, connectTimeout: 1000 });
}
async function main() {
  const action = process.argv[2];
  if (!['start', 'stop', 'status'].includes(action)) throw Error('Use start, stop or status.');
  let connection;
  try { connection = await connect(); } catch (error) {
    if (error.code !== 'ECONNREFUSED') throw error;
  }
  if (connection) {
    try {
      if (action === 'stop') { await connection.query('SHUTDOWN'); console.log('Local PRMS MySQL stopped.'); }
      else { await connection.query('SELECT 1'); console.log('Local PRMS MySQL is running on port 3307.'); }
    } finally { await connection.end(); }
    return;
  }
  if (action !== 'start') { console.log('Local PRMS MySQL is stopped.'); return; }
  const executable = path.join(process.env.ProgramFiles || 'C:\\Program Files', 'MySQL/MySQL Server 8.4/bin/mysqld.exe');
  const config = path.join(directory, 'my.ini');
  if (!fs.existsSync(executable) || !fs.existsSync(config)) throw Error('Local MySQL setup is missing. See docs/MYSQL_MIGRATION.md.');
  const child = spawn(executable, ['--defaults-file=' + config], { detached: true, windowsHide: true, stdio: 'ignore' });
  await new Promise((resolve, reject) => { child.once('spawn', resolve); child.once('error', reject); });
  child.unref();
  for (let attempt = 0; attempt < 30; attempt++) {
    await new Promise(resolve => setTimeout(resolve, 500));
    try { connection = await connect(); await connection.end(); console.log('Local PRMS MySQL started on port 3307.'); return; }
    catch (error) { if (error.code !== 'ECONNREFUSED') throw error; }
  }
  throw Error('MySQL did not start. Inspect the private .artifacts/local-mysql/server.err log.');
}
main().catch(error => { console.error(error.code || error.message); process.exitCode = 1; });

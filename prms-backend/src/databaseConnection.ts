import fs from 'node:fs';

/** Shared connection settings; never guess credentials or disable TLS verification. */
export function databaseOptions(settings: NodeJS.ProcessEnv = process.env) {
  if (!settings.DATABASE_URL) throw new Error('Set DATABASE_URL in the backend .env before starting PRMS.');
  let url: URL;
  try { url = new URL(settings.DATABASE_URL); }
  catch { throw new Error('DATABASE_URL must be a valid mysql:// connection URL.'); }
  if (url.protocol !== 'mysql:' || !url.hostname || !url.username || !url.pathname.slice(1)) {
    throw new Error('DATABASE_URL must identify a MySQL host, user and database.');
  }
  return {
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.slice(1)),
    connectionLimit: 5,
    ssl: settings.MYSQL_SSL === 'true' ? {
      rejectUnauthorized: true,
      ...(settings.MYSQL_SSL_CA ? { ca: fs.readFileSync(settings.MYSQL_SSL_CA, 'utf8') } : {}),
    } : undefined,
  };
}

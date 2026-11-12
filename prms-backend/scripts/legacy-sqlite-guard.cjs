const fs = require('node:fs');
const path = require('node:path');
module.exports = function legacySqliteGuard(args) {
  require('dotenv').config({ path: path.resolve(__dirname, '../.env'), quiet: true });
  if (process.env.DATABASE_URL?.startsWith('mysql:') && !args.includes('--legacy-sqlite')) {
    throw new Error('This is a legacy SQLite utility. PRMS now uses MySQL. Use --legacy-sqlite only when intentionally maintaining an old SQLite backup.');
  }
};

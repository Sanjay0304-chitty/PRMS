import { databaseOptions } from '../databaseConnection';
import fs from 'node:fs';

afterEach(() => jest.restoreAllMocks());

test('missing connection fails without assuming root credentials', () => {
  expect(() => databaseOptions({})).toThrow('Set DATABASE_URL');
});

test.each(['not a URL', 'file:./prisma/dev.db', 'mysql://localhost', 'mysql://user@localhost/'])('rejects invalid or incomplete database setting: %s', DATABASE_URL => {
  expect(() => databaseOptions({ DATABASE_URL })).toThrow('DATABASE_URL');
});

test('preserves encoded credentials and the configured host and port', () => {
  const options = databaseOptions({ DATABASE_URL: 'mysql://test:p%40ss%3Aword@127.0.0.1:3307/prms_test' });
  expect(options).toMatchObject({ host: '127.0.0.1', port: 3307, user: 'test', password: 'p@ss:word', database: 'prms_test' });
});

test('TLS verification stays enabled for remote MySQL', () => {
  const options = databaseOptions({ DATABASE_URL: 'mysql://test:example@db.example.com/prms_test', MYSQL_SSL: 'true' });
  expect(options.ssl).toEqual({ rejectUnauthorized: true });
});

test('uses the explicitly trusted RSA key without enabling public-key retrieval', () => {
  const read = jest.spyOn(fs, 'readFileSync').mockReturnValue('trusted-public-key');
  const options = databaseOptions({ DATABASE_URL: 'mysql://test:example@127.0.0.1:3307/prms_test', MYSQL_RSA_PUBLIC_KEY: 'trusted-key.pem' });
  expect(read).toHaveBeenCalledWith('trusted-key.pem', 'utf8');
  expect(options.cachingRsaPublicKey).toBe('trusted-public-key');
  expect(options).not.toHaveProperty('allowPublicKeyRetrieval');
});

test('fails if the configured trusted RSA key cannot be read', () => {
  jest.spyOn(fs, 'readFileSync').mockImplementation(() => { throw new Error('trusted key unavailable'); });
  expect(() => databaseOptions({ DATABASE_URL: 'mysql://test:example@127.0.0.1/prms_test', MYSQL_RSA_PUBLIC_KEY: 'missing.pem' })).toThrow('trusted key unavailable');
});

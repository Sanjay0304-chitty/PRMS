import { databaseOptions } from '../databaseConnection';

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

import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { test } from 'node:test';

async function loadClient(name) {
  const source = await readFile(new URL(`../src/api/${name}.js`, import.meta.url), 'utf8');
  const mock = `export const calls = [];
    const apiClient = Object.fromEntries(['get','post','delete'].map(method => [method, async path => {
      calls.push({ method, path });
      return { data: { data: { favorited: true } } };
    }]));`;
  const code = source.replace(/import \{ apiClient \} from '\.\/ApiClient';/, mock);
  return import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
}

test('property pages and the tenant dashboard can both list favorites', async () => {
  const { favoritesApi, calls } = await loadClient('favorites');
  calls.length = 0;
  await favoritesApi.list();
  await favoritesApi.getMyFavorites();
  assert.deepEqual(calls, [{ method: 'get', path: '/favorites' }, { method: 'get', path: '/favorites' }]);
});

test('favorite add/remove accept direct IDs and legacy object arguments', async () => {
  const { favoritesApi, calls } = await loadClient('favorites');
  calls.length = 0;
  await favoritesApi.addFavorite('property-1');
  await favoritesApi.addFavorite({ propertyId: 'property-2' });
  await favoritesApi.removeFavorite('property-1');
  await favoritesApi.removeFavorite({ propertyId: 'property-2' });
  assert.deepEqual(calls, [
    { method: 'post', path: '/favorites/property-1' },
    { method: 'post', path: '/favorites/property-2' },
    { method: 'delete', path: '/favorites/property-1' },
    { method: 'delete', path: '/favorites/property-2' },
  ]);
});

test('detail-page favorite check returns the boolean from the response', async () => {
  const { favoritesApi, calls } = await loadClient('favorites');
  calls.length = 0;
  assert.equal(await favoritesApi.checkFavorite('property-1'), true);
  assert.equal(await favoritesApi.isFavorited({ propertyId: 'property-2' }), true);
  assert.deepEqual(calls.map(c => c.path), ['/favorites/property-1', '/favorites/property-2']);
});

test('user summary uses the static admin summary endpoint', async () => {
  const { userApi, calls } = await loadClient('user');
  await userApi.summary();
  assert.deepEqual(calls, [{ method: 'get', path: '/users/summary' }]);
});

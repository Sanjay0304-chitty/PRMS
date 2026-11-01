import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { test } from 'node:test';
const source = await readFile(new URL('../src/utils/privateFiles.js', import.meta.url), 'utf8');
const code = source
  .replace("import { apiClient } from '../api/ApiClient';", `export const calls = []; const apiClient = { get: async (url, options) => { calls.push({url,options}); return {data:new Blob(['test'],{type:'application/pdf'})}; } };`)
  .replace("import { getFullUrl, getApiBaseUrl } from '../config/apiBaseUrl';", `const getApiBaseUrl=()=> 'http://localhost:3500'; const getFullUrl=url=>new URL(url,'http://localhost:3500').href; const window={location:{origin:'http://localhost:5173'}};`);
const files = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
test('recognises protected PRMS paths without treating external URLs as authenticated files', () => {
  assert.equal(files.isPrivateFile('/uploads/maintenance/photo.jpg'), true);
  assert.equal(files.isPrivateFile('/files/agreement.pdf'), true);
  assert.equal(files.isPrivateFile('https://external.example/files/agreement.pdf'), false);
  assert.equal(files.isPrivateFile('/images/public.jpg'), false);
});
test('downloads through the API client without putting credentials in a URL', async () => {
  const result = await files.getFileBlobUrl('/files/agreement.pdf');
  assert.ok(result.startsWith('blob:'));
  assert.equal(files.calls.at(-1).url, 'http://localhost:3500/files/agreement.pdf');
  assert.equal(files.calls.at(-1).options.responseType, 'blob');
  URL.revokeObjectURL(result);
});
test('never sends the authenticated file request to another host', async () => {
  const before = files.calls.length;
  await assert.rejects(files.getFileBlobUrl('https://external.example/files/agreement.pdf'), /outside PRMS/);
  assert.equal(files.calls.length, before);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { safePropertyReturn, rememberPropertyReturn, consumePropertyReturn, intendedPublicRole } from '../src/utils/publicJourney.js';

test('return destinations allow property details only and reject external or role-management paths', () => {
  assert.equal(safePropertyReturn('/properties/pd-040'), '/properties/pd-040');
  for (const value of ['https://example.test', '//example.test', '/admin/users', '/properties/edit/x', '/properties/x?redirect=evil', '/properties/%2f%2fevil', null]) assert.equal(safePropertyReturn(value), null);
});
test('only a Tenant consumes a saved property destination and it is single-use', () => {
  const values = new Map();
  globalThis.sessionStorage = { setItem: (k,v)=>values.set(k,v), getItem:k=>values.get(k), removeItem:k=>values.delete(k) };
  rememberPropertyReturn('/properties/pd-040');
  assert.equal(consumePropertyReturn('Tenant'), '/properties/pd-040');
  assert.equal(consumePropertyReturn('Tenant'), null);
  rememberPropertyReturn('/properties/pd-040');
  assert.equal(consumePropertyReturn('Admin'), null);
});
test('public signup intent never accepts Admin or arbitrary roles', () => {
  assert.equal(intendedPublicRole('tenant'), 'Tenant');
  assert.equal(intendedPublicRole('Landlord'), 'Landlord');
  assert.equal(intendedPublicRole('Agent'), 'Agent');
  assert.equal(intendedPublicRole('Admin'), null);
});

import { apiRequestBudget } from '../requestPolicy';
import { isAllowedOrigin } from '../corsPolicy';

test('the existing 100-request setting does not exhaust a local development session', () => {
  expect(apiRequestBudget('development', 100)).toBe(2000);
});
test('production retains the configured limit', () => {
  expect(apiRequestBudget('production', 100)).toBe(100);
  expect(apiRequestBudget('production', 40)).toBe(40);
});
test('invalid production limits remain bounded', () => {
  expect(apiRequestBudget('production', NaN)).toBe(100);
  expect(apiRequestBudget('production', -1)).toBe(100);
});
test('local development permits the usual Vite ports and loopback aliases', () => {
  for (const origin of ['http://localhost:5174', 'http://127.0.0.1:5173', 'http://[::1]:5175']) {
    expect(isAllowedOrigin(origin, ['http://localhost:5173'], 'development')).toBe(true);
    expect(isAllowedOrigin(origin, ['http://localhost:5173'], 'production')).toBe(false);
  }
});
test('development does not permit unrelated origins or hostname lookalikes', () => {
  for (const origin of ['https://unrelated.example', 'http://localhost.unrelated.example:5173', 'http://127.0.0.1:6000']) {
    expect(isAllowedOrigin(origin, [], 'development')).toBe(false);
  }
});

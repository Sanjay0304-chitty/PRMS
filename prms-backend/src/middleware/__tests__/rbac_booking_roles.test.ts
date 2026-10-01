import { authorize } from '../rbac';

function response() {
  const res: any = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

test('allows a user whose role owns the workflow', () => {
  const req: any = { user: { id: 'tenant-1', role: 'Tenant' } };
  const res = response();
  const next = jest.fn();

  authorize('Tenant')(req, res, next);

  expect(next).toHaveBeenCalledTimes(1);
  expect(res.status).not.toHaveBeenCalled();
});

test('blocks an authenticated user from another role', () => {
  const req: any = { user: { id: 'landlord-1', role: 'Landlord' } };
  const res = response();
  const next = jest.fn();

  authorize('Tenant')(req, res, next);

  expect(next).not.toHaveBeenCalled();
  expect(res.status).toHaveBeenCalledWith(403);
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
    success: false,
    error: { message: 'Insufficient permissions. Required role: Tenant' },
  }));
});

test('rejects a request with no authenticated user', () => {
  const req: any = {};
  const res = response();
  const next = jest.fn();

  authorize('Tenant')(req, res, next);

  expect(next).not.toHaveBeenCalled();
  expect(res.status).toHaveBeenCalledWith(401);
});

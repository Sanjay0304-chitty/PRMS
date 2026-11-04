import { responseCache, clearCache } from '../responseCache';
test('an authenticated property response never seeds or reads the anonymous cache', () => {
  clearCache();
  const makeResponse = () => { const res: any = { statusCode: 200, set: jest.fn(), get: jest.fn(() => 'application/json'), json: jest.fn() }; res.status = jest.fn(() => res); res.type = jest.fn(() => res); return res; };
  const req: any = { method:'GET', originalUrl:'/properties', headers:{authorization:'Bearer test'} };
  const privateRes = makeResponse(); const next = jest.fn();
  responseCache(req, privateRes, next);
  privateRes.json({ data: [{ status:'INACTIVE' }] });
  expect(next).toHaveBeenCalledTimes(1);
  expect(privateRes.set).toHaveBeenCalledWith('Cache-Control','private, no-store');
  const publicNext = jest.fn();
  responseCache({ ...req, headers:{} }, makeResponse(), publicNext);
  expect(publicNext).toHaveBeenCalledTimes(1);
});

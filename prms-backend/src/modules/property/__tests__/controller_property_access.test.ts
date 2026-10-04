import { PropertyController } from '../controller_property';

const propertyFindUnique = jest.fn();
const hasPropertyAuthority = jest.fn();
const updateProperty = jest.fn();
const getLandlordProperties = jest.fn();
const getAllProperties = jest.fn();
const recordAudit = jest.fn();

jest.mock('../../../db', () => ({
  prisma: { property: { findUnique: (...args: any[]) => propertyFindUnique(...args) } },
}));
jest.mock('../../../utils/propertyAuthority', () => ({
  hasPropertyAuthority: (...args: any[]) => hasPropertyAuthority(...args),
}));
jest.mock('../service_property', () => ({
  updateProperty: (...args: any[]) => updateProperty(...args),
  getLandlordProperties: (...args: any[]) => getLandlordProperties(...args),
  getAllProperties: (...args: any[]) => getAllProperties(...args),
}));
jest.mock('../../admin/service_audit', () => ({
  recordAudit: (...args: any[]) => recordAudit(...args),
}));
jest.mock('../../../middleware/responseCache', () => ({ clearCache: jest.fn() }));

function response() {
  const res: any = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

function request(body: any, role = 'Agent', userId = 'agent-user') {
  return {
    body,
    params: { id: 'property-1' },
    user: { id: userId, email: 'agent@prms.com', role },
    headers: {},
    socket: {},
    originalUrl: '/properties/property-1/operational',
    method: 'PATCH',
  } as any;
}

beforeEach(() => {
  jest.clearAllMocks();
  propertyFindUnique.mockResolvedValue({ ownerId: 'landlord-1' });
  updateProperty.mockResolvedValue({ id: 'property-1', title: 'Updated title' });
  getLandlordProperties.mockResolvedValue([{ id: 'property-1', ownerId: 'landlord-1' }]);
  getAllProperties.mockResolvedValue({ properties: [], total: 0 });
});

test('assigned Agents cannot change protected commercial fields', async () => {
  hasPropertyAuthority.mockResolvedValue(true);
  const res = response();
  await new PropertyController().updateOperational(request({ rent: 1, status: 'INACTIVE' }), res);
  expect(res.status).toHaveBeenCalledWith(403);
  expect(updateProperty).not.toHaveBeenCalled();
});

test('unassigned Agents cannot change operational fields', async () => {
  hasPropertyAuthority.mockResolvedValue(false);
  const res = response();
  await new PropertyController().updateOperational(request({ title: 'Updated title' }), res);
  expect(res.status).toHaveBeenCalledWith(403);
  expect(updateProperty).not.toHaveBeenCalled();
});

test('assigned Agents can update only approved operational fields', async () => {
  hasPropertyAuthority.mockResolvedValue(true);
  const res = response();
  const body = { title: 'Updated title', description: 'Updated description', city: 'Kuala Lumpur' };
  await new PropertyController().updateOperational(request(body), res);
  expect(updateProperty).toHaveBeenCalledWith('property-1', body);
  expect(res.json).toHaveBeenCalled();
});

test('a Landlord cannot update another Landlord property', async () => {
  hasPropertyAuthority.mockResolvedValue(false);
  const res = response();
  await new PropertyController().update(request({ title: 'Updated title' }, 'Landlord', 'landlord-2'), res);
  expect(res.status).toHaveBeenCalledWith(403);
  expect(updateProperty).not.toHaveBeenCalled();
});

test('Landlord property listing is scoped to the authenticated Landlord id', async () => {
  const res = response();
  const req = request({}, 'Landlord', 'landlord-current');
  req.originalUrl = '/properties/my-properties';
  req.method = 'GET';

  await new PropertyController().myProperties(req, res);

  expect(getLandlordProperties).toHaveBeenCalledWith('landlord-current');
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
    success: true,
    data: [{ id: 'property-1', ownerId: 'landlord-1' }],
  }));
});

test('property listing normalizes and forwards a valid status filter', async () => {
  const res = response();
  const req: any = request({});
  req.query = { page: '1', limit: '12', status: 'maintenance' };
  req.originalUrl = '/properties?status=maintenance';
  req.method = 'GET';

  await new PropertyController().list(req, res);

  expect(getAllProperties).toHaveBeenCalledWith(1, 12, {
    type: undefined,
    search: undefined,
    status: 'MAINTENANCE',
  });
  expect(res.json).toHaveBeenCalled();
});

test('property listing rejects an unsupported status filter', async () => {
  const res = response();
  const req: any = request({});
  req.query = { status: 'occupied' };
  req.originalUrl = '/properties?status=occupied';
  req.method = 'GET';

  await new PropertyController().list(req, res);

  expect(res.status).toHaveBeenCalledWith(400);
  expect(getAllProperties).not.toHaveBeenCalled();
});

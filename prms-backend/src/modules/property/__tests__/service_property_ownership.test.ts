import { getLandlordProperties } from '../service_property';

const propertyFindMany = jest.fn();

jest.mock('../../../db', () => ({
  prisma: {
    property: {
      findMany: (...args: any[]) => propertyFindMany(...args),
    },
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  propertyFindMany.mockResolvedValue([]);
});

test('queries properties using the authenticated owner id', async () => {
  await getLandlordProperties('landlord-existing-or-new');

  expect(propertyFindMany).toHaveBeenCalledWith(expect.objectContaining({
    where: { ownerId: 'landlord-existing-or-new' },
  }));
});

test('does not fall back to properties owned by other Landlords', async () => {
  propertyFindMany.mockResolvedValue([
    { id: 'property-own', ownerId: 'landlord-1', agentProperties: [] },
  ]);

  const properties = await getLandlordProperties('landlord-1');

  expect(properties).toEqual([
    expect.objectContaining({ id: 'property-own', ownerId: 'landlord-1' }),
  ]);
  expect(propertyFindMany).toHaveBeenCalledTimes(1);
});

import * as service from '../service_property';
import * as db from '../../../db';

const mockFindMany = jest.fn();
const mockFindUnique = jest.fn();
const mockUpdate = jest.fn();
const mockCreate = jest.fn();
const mockCreateMany = jest.fn();
const mockDelete = jest.fn();
const mockDeleteMany = jest.fn();
const mockCount = jest.fn();

jest.mock('../../../db', () => ({
  prisma: {
    property: {
      findMany: (...args: any[]) => mockFindMany(...args),
      findUnique: (...args: any[]) => mockFindUnique(...args),
      update: (...args: any[]) => mockUpdate(...args),
      create: (...args: any[]) => mockCreate(...args),
      count: (...args: any[]) => mockCount(...args),
    },
    propertyImage: {
      findMany: (...args: any[]) => mockFindMany(...args),
      findUnique: (...args: any[]) => mockFindUnique(...args),
      create: (...args: any[]) => mockCreate(...args),
      createMany: (...args: any[]) => mockCreateMany(...args),
      delete: (...args: any[]) => mockDelete(...args),
      deleteMany: (...args: any[]) => mockDeleteMany(...args),
    },
    amenity: {
      findMany: (...args: any[]) => mockFindMany(...args),
      findUnique: (...args: any[]) => mockFindUnique(...args),
      create: (...args: any[]) => mockCreate(...args),
      createMany: (...args: any[]) => mockCreateMany(...args),
      update: (...args: any[]) => mockUpdate(...args),
      delete: (...args: any[]) => mockDelete(...args),
      deleteMany: (...args: any[]) => mockDeleteMany(...args),
    },
  },
}));

const clearAll = () => {
  mockFindMany.mockClear();
  mockFindUnique.mockClear();
  mockUpdate.mockClear();
  mockCreate.mockClear();
  mockCreateMany.mockClear();
  mockDelete.mockClear();
  mockDeleteMany.mockClear();
  mockCount.mockClear();
  mockFindMany.mockResolvedValue([]);
  mockFindUnique.mockResolvedValue(null);
  mockUpdate.mockResolvedValue({});
  mockCreate.mockResolvedValue({});
  mockCreateMany.mockResolvedValue({ count: 0 });
  mockDelete.mockResolvedValue({});
  mockDeleteMany.mockResolvedValue({ count: 0 });
  mockCount.mockResolvedValue(0);
};

const PROP_ID = 'prop-1';

function stubPropertyData(overrides = {}) {
  return {
    id: PROP_ID,
    title: 'Updated Title',
    rent: 1500,
    ...overrides,
  };
}

beforeEach(clearAll);

/* ============================================================
   normalizeDate
   ============================================================ */
describe('normalizeDate', () => {
  test('returns undefined for falsy values', () => {
    expect(service.normalizeDate(null)).toBeUndefined();
    expect(service.normalizeDate(undefined)).toBeUndefined();
    expect(service.normalizeDate('')).toBeUndefined();
  });

  test('returns Date for Date instances', () => {
    const d = new Date('2026-06-01');
    expect(service.normalizeDate(d)).toBe(d);
  });

  test('parses ISO string to Date', () => {
    const d = service.normalizeDate('2026-06-01T00:00:00Z');
    expect(d).toBeInstanceOf(Date);
    expect(d!.getFullYear()).toBe(2026);
  });

  test('returns undefined for invalid string', () => {
    expect(service.normalizeDate('not-a-date')).toBeUndefined();
  });
});

/* ============================================================
   updateProperty  -  core fields
   ============================================================ */
describe('updateProperty - core fields', () => {
  test('updates title, address, rent', async () => {
    const propData = stubPropertyData();
    mockUpdate.mockResolvedValueOnce(propData);
    mockFindUnique.mockResolvedValueOnce(propData);
    const result = await service.updateProperty(PROP_ID, {
      title: 'New Title',
      address: '123 Main St',
      rent: 2000,
    });
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: PROP_ID },
      data: expect.objectContaining({ title: 'New Title', address: '123 Main St', rent: 2000 }),
      include: expect.any(Object),
    });
    expect(result).toBe(propData);
  });

  test('saves description when provided', async () => {
    mockUpdate.mockResolvedValueOnce({ description: 'Spacious' });
    mockFindUnique.mockResolvedValueOnce({ description: 'Spacious' });
    await service.updateProperty(PROP_ID, { description: 'Spacious' });
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ description: 'Spacious' }) }),
    );
  });

  test('property_type is optional', async () => {
    mockUpdate.mockResolvedValueOnce({});
    mockFindUnique.mockResolvedValueOnce({});
    await service.updateProperty(PROP_ID, { rent: 300 });
    const callData = mockUpdate.mock.calls[0][0].data;
    expect(callData).toHaveProperty('rent', 300);
  });

  test('normalizes date-only availableFrom/availableTo strings', async () => {
    mockUpdate.mockResolvedValueOnce({});
    mockFindUnique.mockResolvedValueOnce({});
    await service.updateProperty(PROP_ID, {
      availableFrom: '2026-07-01',
      availableTo: '2026-12-31',
    });
    const callData = mockUpdate.mock.calls[0][0].data;
    expect(callData.availableFrom).toBeInstanceOf(Date);
    expect(callData.availableTo).toBeInstanceOf(Date);
  });

  test('partial update touches only the supplied key', async () => {
    mockUpdate.mockResolvedValueOnce({ status: 'RENTED' });
    mockFindUnique.mockResolvedValueOnce({ status: 'RENTED' });
    await service.updateProperty(PROP_ID, { status: 'RENTED' });
    const callData = mockUpdate.mock.calls[0][0].data;
    expect(callData).toHaveProperty('status', 'RENTED');
    expect(callData).not.toHaveProperty('title');
  });

  test('invalid enum status is still passed through to Prisma', async () => {
    mockUpdate.mockResolvedValueOnce({});
    mockFindUnique.mockResolvedValueOnce({});
    await service.updateProperty(PROP_ID, { status: 'SOME_BAD_VALUE' });
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'SOME_BAD_VALUE' }) }),
    );
  });

  test('rent of 0 is accepted (validation only rejects in HTTP layer)', async () => {
    mockUpdate.mockResolvedValueOnce({});
    mockFindUnique.mockResolvedValueOnce({});
    await service.updateProperty(PROP_ID, { rent: 0 });
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ rent: 0 }) }),
    );
  });
});

/* ============================================================
   updateProperty  -  amenities
   ============================================================ */
describe('updateProperty - amenities', () => {
  test('adds amenities to property', async () => {
    const amenitiesIn = [
      { id: 'a1', name: 'Wi-Fi' },
      { id: 'a2', name: 'Parking' },
    ];
    mockUpdate.mockResolvedValueOnce({});
    mockFindMany.mockResolvedValueOnce([]);
    mockCreateMany.mockResolvedValueOnce({ count: 2 });
    mockFindUnique.mockResolvedValueOnce({});
    await service.updateProperty(PROP_ID, { amenities: amenitiesIn });
    expect(mockCreateMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({ name: 'Wi-Fi', propertyId: PROP_ID }),
        expect.objectContaining({ name: 'Parking', propertyId: PROP_ID }),
      ]),
    });
  });

  test('removes amenities no longer present', async () => {
    const existing = [{ id: 'a1' }, { id: 'a2' }];
    mockUpdate.mockResolvedValueOnce({});
    mockFindMany.mockResolvedValueOnce(existing);
    mockDeleteMany.mockResolvedValueOnce({ count: 1 });
    mockFindUnique.mockResolvedValueOnce({});
    await service.updateProperty(PROP_ID, { amenities: [{ id: 'a1', name: 'Wi-Fi' }] });
    expect(mockDeleteMany).toHaveBeenCalledWith({ where: { id: { in: ['a2'] } } });
  });

  test('updates existing amenity name/description', async () => {
    const existing = [{ id: 'a1', name: 'Old' }];
    mockUpdate.mockImplementation(async (args: any) => {
      if (args.where?.id === 'a1') return { id: 'a1', name: args.data.name };
      return {};
    });
    mockFindMany.mockResolvedValueOnce(existing);
    mockFindUnique.mockResolvedValueOnce({});
    await service.updateProperty(PROP_ID, { amenities: [{ id: 'a1', name: 'Wi-Fi', description: 'Fast' }] });
    expect(mockUpdate).toHaveBeenCalledWith(
      { where: { id: 'a1' }, data: { name: 'Wi-Fi', description: 'Fast' } },
    );
  });

  test('uses upsert semantics via ID reuse and removes unknown IDs', async () => {
    const existing = [{ id: 'x1' }];
    mockUpdate.mockResolvedValueOnce({});
    mockFindMany.mockResolvedValueOnce(existing);
    mockDeleteMany.mockResolvedValueOnce({ count: 1 });
    mockCreateMany.mockResolvedValueOnce({ count: 1 });
    mockFindUnique.mockResolvedValueOnce({});
    // Incoming only has 'y1' (new); x1 is removed
    await service.updateProperty(PROP_ID, { amenities: [{ id: 'y1', name: 'Pool' }] });
    expect(mockCreateMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({ name: 'Pool', propertyId: PROP_ID })],
    });
    expect(mockDeleteMany).toHaveBeenCalledWith({ where: { id: { in: ['x1'] } } });
  });

  test('adds + updates + removes in one call', async () => {
    const existing = [{ id: 'a1' }, { id: 'a2' }, { id: 'a3' }];
    const incoming = [
      { id: 'a1', name: 'Wi-Fi' },
      { id: 'a2', name: 'Parking' },
      { id: 'a4', name: 'Pool' },
    ];
    let updateCalls: any[] = [];
    mockUpdate.mockImplementation(async (args: any) => {
      updateCalls.push(args);
      return {};
    });
    mockFindMany.mockResolvedValueOnce(existing);
    mockCreateMany.mockResolvedValueOnce({ count: 1 });
    mockDeleteMany.mockResolvedValueOnce({ count: 1 });
    mockFindUnique.mockResolvedValueOnce({});
    await service.updateProperty(PROP_ID, { amenities: incoming });
    // First call is the property core update, remaining are amenity updates
    const amenityUpdates = updateCalls.filter((c) => c.where?.id.startsWith('a'));
    expect(amenityUpdates).toHaveLength(2);
    expect(amenityUpdates[0].data.name).toBe('Wi-Fi');
    expect(amenityUpdates[1].data.name).toBe('Parking');
    // a4 created, a3 deleted
    expect(mockCreateMany).toHaveBeenCalledWith({ data: [expect.objectContaining({ name: 'Pool', propertyId: PROP_ID })] });
    expect(mockDeleteMany).toHaveBeenCalledWith({ where: { id: { in: ['a3'] } } });
  });
});

/* ============================================================
   updateProperty  -  description + media combined
   ============================================================ */
describe('updateProperty - combined', () => {
  test('description + images updated together', async () => {
    mockUpdate.mockResolvedValueOnce({ description: 'Nice' });
    mockFindMany.mockResolvedValueOnce([]);
    mockCreateMany.mockResolvedValueOnce({ count: 1 });
    mockFindUnique.mockResolvedValueOnce({});
    await service.updateProperty(PROP_ID, {
      description: 'Nice',
      images: [{ id: 'img1', url: '/img1.jpg' }],
    });
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ description: 'Nice' }) }),
    );
    expect(mockCreateMany).toHaveBeenCalled();
  });
});

/* ============================================================
   updateProperty  -  media (images)
   ============================================================ */
describe('updateProperty - media images', () => {
  test('adds new image', async () => {
    const img = { id: 'img1', url: '/photo.jpg' };
    mockUpdate.mockResolvedValueOnce({});
    mockFindMany.mockResolvedValueOnce([]);
    mockCreateMany.mockResolvedValueOnce({ count: 1 });
    mockFindUnique.mockResolvedValueOnce({});
    await service.updateProperty(PROP_ID, { images: [img] });
    expect(mockCreateMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([{ ...img, propertyId: PROP_ID }]),
    });
  });

  test('removes image not in incoming list', async () => {
    mockUpdate.mockResolvedValueOnce({});
    mockFindMany.mockResolvedValueOnce([{ id: 'img1' }]);
    mockDeleteMany.mockResolvedValueOnce({ count: 1 });
    mockFindUnique.mockResolvedValueOnce({});
    await service.updateProperty(PROP_ID, { images: [] });
    expect(mockDeleteMany).toHaveBeenCalledWith({ where: { id: { in: ['img1'] } } });
  });
});

/* ============================================================
   updateProperty  -  media (videos)
   ============================================================ */
describe('updateProperty - media videos', () => {
  test('adds video', async () => {
    const vid = { id: 'vid1', url: '/tour.mp4' };
    mockUpdate.mockResolvedValueOnce({});
    mockFindMany.mockResolvedValueOnce([]);
    mockCreateMany.mockResolvedValueOnce({ count: 1 });
    mockFindUnique.mockResolvedValueOnce({});
    await service.updateProperty(PROP_ID, { videos: [vid] });
    expect(mockCreateMany).toHaveBeenCalledWith({
      data: [{ ...vid, propertyId: PROP_ID, type: 'video' }],
    });
  });
});

/* ============================================================
   getLandlordProperties
   ============================================================ */
describe('getLandlordProperties', () => {
  test('returns properties with agentProperties list', async () => {
    const properties = [
      { id: 'p1', agentProperties: [{ agent: { id: 'ag1', name: 'Zain' } }] },
    ];
    mockFindMany.mockResolvedValueOnce(properties);
    const result = await service.getLandlordProperties('landlord-1');
    expect(result).toHaveLength(1);
    expect(result[0].agentProperties).toEqual([{ id: 'ag1', name: 'Zain' }]);
  });
});

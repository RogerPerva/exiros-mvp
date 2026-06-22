import { LocationsService } from './locations.service';
import { IngestBatchDto } from './dto/ingest-batch.dto';

describe('LocationsService.addBatch', () => {
  let prisma: {
    location: { createMany: jest.Mock; findMany: jest.Mock };
    trip: { updateMany: jest.Mock };
  };
  let service: LocationsService;

  beforeEach(() => {
    prisma = {
      location: {
        createMany: jest.fn().mockResolvedValue({ count: 0 }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      trip: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    };
    service = new LocationsService(prisma as never);
  });

  const batch = (points: IngestBatchDto['points']): IngestBatchDto => ({
    batchId: '11111111-1111-4111-8111-111111111111',
    points,
  });

  it('persiste puntos válidos con skipDuplicates y batchId del lote', async () => {
    prisma.location.createMany.mockResolvedValue({ count: 2 });
    const dto = batch([
      {
        lat: 25.67,
        lng: -100.3,
        accuracyMeters: 12,
        recordedAt: '2026-06-22T15:00:00.000Z',
      },
      {
        lat: 25.68,
        lng: -100.31,
        accuracyMeters: 20,
        recordedAt: '2026-06-22T15:05:00.000Z',
      },
    ]);

    const res = await service.addBatch('trip-1', dto);

    expect(res.stored).toBe(2);
    expect(res.received).toBe(2);
    expect(res.skipped).toBe(0);
    expect(res.stopTracking).toBe(false);
    const calls = prisma.location.createMany.mock.calls as Array<
      [
        {
          data: Array<{ tripId: string; batchId: string; recordedAt: Date }>;
          skipDuplicates: boolean;
        },
      ]
    >;
    const call = calls[0][0];
    expect(call.skipDuplicates).toBe(true);
    expect(call.data).toHaveLength(2);
    expect(call.data[0].tripId).toBe('trip-1');
    expect(call.data[0].batchId).toBe(dto.batchId);
    expect(call.data[0].recordedAt).toBeInstanceOf(Date);
  });

  it('descarta puntos fuera de México o con timestamp futuro (skipped, no se insertan)', async () => {
    const future = new Date(Date.now() + 5 * 60_000).toISOString();
    const dto = batch([
      {
        lat: 25.67,
        lng: -100.3,
        accuracyMeters: 12,
        recordedAt: '2026-06-22T15:00:00.000Z',
      }, // ok
      {
        lat: 48.85,
        lng: 2.35,
        accuracyMeters: 10,
        recordedAt: '2026-06-22T15:00:00.000Z',
      }, // París, fuera bbox
      { lat: 25.67, lng: -100.3, accuracyMeters: 12, recordedAt: future }, // futuro
    ]);
    prisma.location.createMany.mockResolvedValue({ count: 1 });

    const res = await service.addBatch('trip-1', dto);

    expect(res.received).toBe(3);
    expect(res.skipped).toBe(2);
    const calls = prisma.location.createMany.mock.calls as Array<
      [{ data: unknown[] }]
    >;
    expect(calls[0][0].data).toHaveLength(1); // sólo el válido llega a la BD
  });

  it('si no hay puntos válidos, no inserta ni toca lastLocationAt', async () => {
    const dto = batch([
      {
        lat: 0,
        lng: 0,
        accuracyMeters: 5,
        recordedAt: '2026-06-22T15:00:00.000Z',
      }, // 0,0 fuera de MX
    ]);

    const res = await service.addBatch('trip-1', dto);

    expect(res.stored).toBe(0);
    expect(res.skipped).toBe(1);
    expect(prisma.location.createMany).not.toHaveBeenCalled();
    expect(prisma.trip.updateMany).not.toHaveBeenCalled();
  });
});

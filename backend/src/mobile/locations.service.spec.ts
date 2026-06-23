import { LocationsService } from './locations.service';
import { IngestBatchDto } from './dto/ingest-batch.dto';

describe('LocationsService.addBatch', () => {
  let prisma: {
    location: { createMany: jest.Mock };
    trip: { updateMany: jest.Mock };
  };
  let service: LocationsService;

  beforeEach(() => {
    prisma = {
      location: { createMany: jest.fn().mockResolvedValue({ count: 0 }) },
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

    const res = await service.addBatch('trip-1', dto, 'EN_RUTA');

    expect(res.accepted).toBe(2);
    expect(res.duplicateBatch).toBe(false);
    expect(res.trip).toEqual({ status: 'EN_RUTA', stopTracking: false });
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

    const res = await service.addBatch('trip-1', dto, 'EN_RUTA');

    expect(res.accepted).toBe(1); // sólo el válido se persiste
    expect(res.duplicateBatch).toBe(false); // no es un reenvío, son puntos inválidos
    const calls = prisma.location.createMany.mock.calls as Array<
      [{ data: unknown[] }]
    >;
    expect(calls[0][0].data).toHaveLength(1); // sólo el válido llega a la BD
  });

  it('lote repetido (válidos pero todos duplicados) → accepted 0, duplicateBatch true', async () => {
    prisma.location.createMany.mockResolvedValue({ count: 0 }); // índice único descartó todo
    const dto = batch([
      {
        lat: 25.67,
        lng: -100.3,
        accuracyMeters: 12,
        recordedAt: '2026-06-22T15:00:00.000Z',
      },
    ]);

    const res = await service.addBatch('trip-1', dto, 'EN_RUTA');

    expect(res.accepted).toBe(0);
    expect(res.duplicateBatch).toBe(true);
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

    const res = await service.addBatch('trip-1', dto, 'EN_RUTA');

    expect(res.accepted).toBe(0);
    expect(res.duplicateBatch).toBe(false);
    expect(prisma.location.createMany).not.toHaveBeenCalled();
    expect(prisma.trip.updateMany).not.toHaveBeenCalled();
  });
});

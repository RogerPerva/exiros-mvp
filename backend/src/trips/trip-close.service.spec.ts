import { ConflictException, NotFoundException } from '@nestjs/common';
import { TripCloseService } from './trip-close.service';

describe('TripCloseService.close', () => {
  let prisma: {
    trip: {
      updateMany: jest.Mock;
      findUnique: jest.Mock;
      findUniqueOrThrow: jest.Mock;
    };
    location: {
      findFirst: jest.Mock;
    };
  };
  let service: TripCloseService;

  beforeEach(() => {
    prisma = {
      trip: {
        updateMany: jest.fn(),
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          id: 'trip-1',
          status: 'CONCLUIDO',
          closureType: 'MANUAL_OPERATOR',
          endedAt: new Date(),
          observations: 'ok',
        }),
      },
      location: {
        findFirst: jest.fn().mockResolvedValue({ lat: 19.17, lng: -96.13 }),
      },
    };
    service = new TripCloseService(prisma as never);
  });

  const params = {
    tripId: 'trip-1',
    closureType: 'MANUAL_OPERATOR' as const,
    observations: 'entrega cancelada',
    endedAt: new Date('2026-06-22T17:00:00.000Z'),
    closeRequestId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  };

  it('cierra atómicamente (WHERE status=EN_RUTA) y devuelve el viaje', async () => {
    prisma.trip.updateMany.mockResolvedValue({ count: 1 });

    const res = await service.close(params);

    expect(res.status).toBe('CONCLUIDO');
    const calls = prisma.trip.updateMany.mock.calls as Array<
      [{ where: { status: string }; data: { endLat: number; endLng: number } }]
    >;
    expect(calls[0][0].where.status).toBe('EN_RUTA');
    // Fija el "punto de cierre" desde el último punto guardado.
    expect(calls[0][0].data.endLat).toBe(19.17);
    expect(calls[0][0].data.endLng).toBe(-96.13);
  });

  it('sin puntos guardados → cierra con endLat/endLng en null', async () => {
    prisma.location.findFirst.mockResolvedValue(null);
    prisma.trip.updateMany.mockResolvedValue({ count: 1 });

    await service.close(params);

    const calls = prisma.trip.updateMany.mock.calls as Array<
      [{ data: { endLat: number | null; endLng: number | null } }]
    >;
    expect(calls[0][0].data.endLat).toBeNull();
    expect(calls[0][0].data.endLng).toBeNull();
  });

  it('reintento idempotente: mismo closeRequestId ya aplicado → mismo resultado, no error', async () => {
    prisma.trip.updateMany.mockResolvedValue({ count: 0 }); // ya estaba cerrado
    prisma.trip.findUnique.mockResolvedValue({
      id: 'trip-1',
      closeRequestId: params.closeRequestId,
    });

    const res = await service.close(params);
    expect(res.status).toBe('CONCLUIDO');
  });

  it('carrera perdida con OTRO cierre → 409 TRIP_ALREADY_CONCLUDED', async () => {
    prisma.trip.updateMany.mockResolvedValue({ count: 0 });
    prisma.trip.findUnique.mockResolvedValue({
      id: 'trip-1',
      closeRequestId: 'otro',
    });

    await expect(service.close(params)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('viaje inexistente → 404', async () => {
    prisma.trip.updateMany.mockResolvedValue({ count: 0 });
    prisma.trip.findUnique.mockResolvedValue(null);

    await expect(service.close(params)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

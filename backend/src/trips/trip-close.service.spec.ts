import { ConflictException, NotFoundException } from '@nestjs/common';
import { TripCloseService } from './trip-close.service';

describe('TripCloseService.close', () => {
  let prisma: {
    trip: {
      updateMany: jest.Mock;
      findUnique: jest.Mock;
      findUniqueOrThrow: jest.Mock;
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
      [{ where: { status: string } }]
    >;
    expect(calls[0][0].where.status).toBe('EN_RUTA');
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

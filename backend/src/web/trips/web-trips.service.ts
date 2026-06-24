import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/** Lectura de viajes para el portal (W1/W2): activos primero, luego recientes. */
@Injectable()
export class WebTripsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Detalle de un viaje (W3): campos + cierre + foto + ruta completa (OpenAPI: TripDetail). */
  async findOne(id: string) {
    const trip = await this.prisma.trip.findUnique({
      where: { id },
      select: {
        id: true,
        providerNumber: true,
        providerName: true,
        folio: true,
        frontPlate: true,
        rearPlate: true,
        status: true,
        startedAt: true,
        endedAt: true,
        closureType: true,
        observations: true,
        photoPath: true,
        destination: {
          select: {
            name: true,
            centerLat: true,
            centerLng: true,
            radiusMeters: true,
          },
        },
        locations: {
          // recordedAt + id: orden estable de la polilínea ante empates de timestamp.
          orderBy: [{ recordedAt: 'asc' }, { id: 'asc' }],
          select: { lat: true, lng: true, recordedAt: true },
        },
      },
    });
    if (!trip) throw new NotFoundException('El viaje no existe');

    const { locations, endedAt, startedAt, ...rest } = trip;
    const durationMinutes = endedAt
      ? Math.max(
          0,
          Math.floor((endedAt.getTime() - startedAt.getTime()) / 60_000),
        )
      : null;

    return { ...rest, startedAt, endedAt, durationMinutes, route: locations };
  }

  async findAll() {
    const trips = await this.prisma.trip.findMany({
      orderBy: [{ status: 'asc' }, { startedAt: 'desc' }],
      select: {
        id: true,
        providerNumber: true,
        providerName: true,
        folio: true,
        frontPlate: true,
        rearPlate: true,
        status: true,
        startedAt: true,
        endedAt: true,
        photoPath: true,
        destination: {
          select: {
            name: true,
            centerLat: true,
            centerLng: true,
            radiusMeters: true,
          },
        },
        // Último punto de ruta (alimentado por los lotes de ingesta) para pintarlo en el mapa W1.
        locations: {
          orderBy: { recordedAt: 'desc' },
          take: 1,
          select: { lat: true, lng: true, recordedAt: true },
        },
      },
    });

    // Aplanar el último punto a `lastLocation` (o null) para el portal.
    return trips.map(({ locations, ...trip }) => ({
      ...trip,
      lastLocation: locations[0] ?? null,
    }));
  }
}

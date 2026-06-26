import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ListTripsQueryDto } from './dto/list-trips-query.dto';

/** Columnas del resumen de viaje (tabla W2 y feed del mapa W1). Fuente única para findPage/findForMap. */
const TRIP_SUMMARY_SELECT = {
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
      id: true,
      name: true,
      centerLat: true,
      centerLng: true,
      radiusMeters: true,
    },
  },
  // Último punto de ruta (alimentado por los lotes de ingesta) para pintarlo en el mapa W1.
  locations: {
    orderBy: { recordedAt: 'desc' as const },
    take: 1,
    select: { lat: true, lng: true, recordedAt: true },
  },
} satisfies Prisma.TripSelect;

type TripRow = Prisma.TripGetPayload<{ select: typeof TRIP_SUMMARY_SELECT }>;

/** Aplana el último punto a `lastLocation` (o null) para el portal. */
function toSummary({ locations, ...trip }: TripRow) {
  return { ...trip, lastLocation: locations[0] ?? null };
}

const DEFAULT_PAGE_SIZE = 50;

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
            id: true,
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

  /** W2 tabla: viajes paginados con filtros server-side (status/destino/rango/búsqueda). */
  async findPage(query: ListTripsQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
    const where = buildWhere(query);

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.trip.count({ where }),
      this.prisma.trip.findMany({
        where,
        orderBy: [{ status: 'asc' }, { startedAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: TRIP_SUMMARY_SELECT,
      }),
    ]);

    return { data: rows.map(toSummary), total, page, pageSize };
  }

  /** W1 mapa: feed de monitoreo (todos los viajes con su último punto, activos primero). Sin paginar. */
  async findForMap() {
    const rows = await this.prisma.trip.findMany({
      orderBy: [{ status: 'asc' }, { startedAt: 'desc' }],
      select: TRIP_SUMMARY_SELECT,
    });
    return rows.map(toSummary);
  }
}

/** Filtros server-side de la tabla de viajes. Vacíos = sin filtrar. */
function buildWhere(query: ListTripsQueryDto): Prisma.TripWhereInput {
  const where: Prisma.TripWhereInput = {};
  if (query.from || query.to) {
    where.startedAt = {
      ...(query.from ? { gte: new Date(query.from) } : {}),
      ...(query.to ? { lte: new Date(query.to) } : {}),
    };
  }
  if (query.status) where.status = query.status;
  if (query.destinationId) where.destinationId = query.destinationId;
  if (query.search?.trim()) {
    const s = query.search.trim();
    where.OR = [
      { folio: { contains: s, mode: 'insensitive' } },
      { frontPlate: { contains: s, mode: 'insensitive' } },
    ];
  }
  return where;
}

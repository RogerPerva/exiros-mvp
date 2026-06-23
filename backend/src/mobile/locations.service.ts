import { Injectable } from '@nestjs/common';
import type { TripStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { IngestBatchDto, IngestPointDto } from './dto/ingest-batch.dto';

/** Caja envolvente de México (aprox) para descartar puntos fuera de región. */
const MX_BBOX = { latMin: 14.3, latMax: 32.9, lngMin: -118.7, lngMax: -86.5 };
/** Tolerancia de reloj para `recordedAt` (60 s) — descarta timestamps del futuro. */
const FUTURE_SKEW_MS = 60_000;

/** Respuesta de la ingesta (contrato `IngestResponse` de api-spec.md §4 / openapi.yaml). */
export interface IngestResult {
  accepted: number;
  duplicateBatch: boolean;
  trip: { status: TripStatus; stopTracking: boolean };
}

/**
 * Ingesta de ruta por lotes (3.4). Trata cada punto como hostil: valida estructura en el
 * DTO y filtra aquí lo semántico (bbox MX, timestamp no futuro). `batchId` + índice único
 * `tripId+batchId+recordedAt` dan idempotencia (reenvío no duplica → `duplicateBatch:true`).
 * La selección de los 2 puntos frescos/precisos y el cierre por geocerca son Fase 4
 * (entonces `stopTracking` podrá ser true; hoy el guard sólo deja pasar viajes EN_RUTA).
 */
@Injectable()
export class LocationsService {
  constructor(private readonly prisma: PrismaService) {}

  async addBatch(
    tripId: string,
    dto: IngestBatchDto,
    status: TripStatus,
  ): Promise<IngestResult> {
    const now = Date.now();
    const valid = dto.points.filter((p) => this.isValid(p, now));

    let accepted = 0;
    if (valid.length > 0) {
      const created = await this.prisma.location.createMany({
        data: valid.map((p) => ({
          tripId,
          lat: p.lat,
          lng: p.lng,
          accuracyMeters: p.accuracyMeters,
          recordedAt: new Date(p.recordedAt),
          batchId: dto.batchId,
        })),
        skipDuplicates: true, // reenviar el mismo lote no duplica (idempotencia)
      });
      accepted = created.count;

      // lastLocationAt avanza al punto más reciente del lote (sólo si es más nuevo).
      const newest = new Date(
        valid.reduce((max, p) => Math.max(max, Date.parse(p.recordedAt)), 0),
      );
      await this.prisma.trip.updateMany({
        where: {
          id: tripId,
          OR: [{ lastLocationAt: null }, { lastLocationAt: { lt: newest } }],
        },
        data: { lastLocationAt: newest },
      });
    }

    // Lote repetido: había puntos válidos pero el índice único los descartó todos.
    const duplicateBatch = valid.length > 0 && accepted === 0;

    return {
      accepted,
      duplicateBatch,
      trip: { status, stopTracking: false }, // stopTracking lo decide la geocerca en Fase 4
    };
  }

  private isValid(p: IngestPointDto, now: number): boolean {
    const t = Date.parse(p.recordedAt);
    if (Number.isNaN(t) || t > now + FUTURE_SKEW_MS) return false;
    if (p.lat < MX_BBOX.latMin || p.lat > MX_BBOX.latMax) return false;
    if (p.lng < MX_BBOX.lngMin || p.lng > MX_BBOX.lngMax) return false;
    return true;
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IngestBatchDto, IngestPointDto } from './dto/ingest-batch.dto';

/** Caja envolvente de México (aprox) para descartar puntos fuera de región. */
const MX_BBOX = { latMin: 14.3, latMax: 32.9, lngMin: -118.7, lngMax: -86.5 };
/** Tolerancia de reloj para `recordedAt` (60 s) — descarta timestamps del futuro. */
const FUTURE_SKEW_MS = 60_000;
/** Precisión máxima (m) para que un punto sea elegible para evaluar geocerca (Fase 4). */
const ACCURACY_ELIGIBLE_M = 50;

/**
 * Ingesta de ruta por lotes (3.4). Trata cada punto como hostil: valida estructura en el
 * DTO y filtra aquí lo semántico (bbox MX, timestamp no futuro). `batchId` + índice único
 * `tripId+batchId+recordedAt` dan idempotencia (reenvío no duplica). Todos los puntos válidos
 * alimentan la ruta; sólo los 2 más recientes elegibles por precisión alimentan la geocerca.
 */
@Injectable()
export class LocationsService {
  constructor(private readonly prisma: PrismaService) {}

  async addBatch(tripId: string, dto: IngestBatchDto) {
    const now = Date.now();
    const valid = dto.points.filter((p) => this.isValid(p, now));

    let stored = 0;
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
      stored = created.count;

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

    // Selección de geocerca: hasta los 2 puntos más recientes elegibles por precisión.
    // El cierre por haversine sobre estos candidatos es Fase 4; aquí sólo se exponen.
    const geofenceCandidates = await this.prisma.location.findMany({
      where: { tripId, accuracyMeters: { lte: ACCURACY_ELIGIBLE_M } },
      orderBy: { recordedAt: 'desc' },
      take: 2,
      select: { lat: true, lng: true, accuracyMeters: true, recordedAt: true },
    });

    return {
      batchId: dto.batchId,
      received: dto.points.length,
      stored,
      skipped: dto.points.length - valid.length,
      geofenceCandidates: geofenceCandidates.length,
      stopTracking: false, // el cierre por geocerca llega en Fase 4
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

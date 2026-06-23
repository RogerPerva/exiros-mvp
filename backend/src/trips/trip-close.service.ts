import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { ClosureType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface CloseParams {
  tripId: string;
  closureType: Extract<ClosureType, 'MANUAL_OPERATOR' | 'MANUAL_ADMIN'>;
  observations: string;
  endedAt: Date;
  /** Móvil: idempotencia del cierre offline (reintento = mismo resultado). */
  closeRequestId?: string;
  /** Web: usuario admin que fuerza el cierre (null hasta que exista auth, Fase 6.1). */
  closedById?: string | null;
}

export interface CloseResult {
  id: string;
  status: 'CONCLUIDO';
  closureType: ClosureType;
  endedAt: Date | null;
  observations: string | null;
}

/**
 * Transición de cierre compartida por el cierre del operador (móvil, 4.2) y el del admin
 * (web, 4.3). El cierre es **atómico y condicional** (`updateMany WHERE status=EN_RUTA`):
 * en una carrera sólo un actor gana. El perdedor con OTRO cierre recibe `TRIP_ALREADY_CONCLUDED`;
 * un reintento móvil con el MISMO `closeRequestId` es idempotente (devuelve el mismo resultado).
 */
@Injectable()
export class TripCloseService {
  constructor(private readonly prisma: PrismaService) {}

  async close(params: CloseParams): Promise<CloseResult> {
    const {
      tripId,
      closureType,
      observations,
      endedAt,
      closeRequestId,
      closedById,
    } = params;

    const updated = await this.prisma.trip.updateMany({
      where: { id: tripId, status: 'EN_RUTA' },
      data: {
        status: 'CONCLUIDO',
        closureType,
        observations,
        endedAt,
        closedById: closedById ?? null,
        closeRequestId: closeRequestId ?? null,
      },
    });

    if (updated.count === 1) return this.read(tripId);

    // count 0 → ya estaba CONCLUIDO (o no existe).
    const existing = await this.prisma.trip.findUnique({
      where: { id: tripId },
    });
    if (!existing) throw new NotFoundException('Viaje no encontrado');

    // Reintento idempotente del MISMO cierre offline → mismo resultado, no es error.
    if (closeRequestId && existing.closeRequestId === closeRequestId) {
      return this.read(tripId);
    }
    throw new ConflictException('TRIP_ALREADY_CONCLUDED');
  }

  private async read(tripId: string): Promise<CloseResult> {
    const t = await this.prisma.trip.findUniqueOrThrow({
      where: { id: tripId },
      select: {
        id: true,
        status: true,
        closureType: true,
        endedAt: true,
        observations: true,
      },
    });
    return t as CloseResult;
  }
}

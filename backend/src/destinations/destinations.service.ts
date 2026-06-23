import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const SELECT = {
  id: true,
  name: true,
  centerLat: true,
  centerLng: true,
  radiusMeters: true,
  isActive: true,
} as const;

interface DestinationInput {
  name: string;
  centerLat: number;
  centerLng: number;
  radiusMeters: number;
}

/** Servicio único de destinos (regla anti-duplicación §2.1: lo comparten web y mobile). */
@Injectable()
export class DestinationsService {
  constructor(private readonly prisma: PrismaService) {}

  /** RN-09/RN-14: catálogo activo para el dropdown. Vacío → []. */
  findActive() {
    return this.prisma.destination.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        centerLat: true,
        centerLng: true,
        radiusMeters: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  /** W4: todos los destinos (activos primero), incluye dados de baja para restaurar. */
  findAllWeb() {
    return this.prisma.destination.findMany({
      select: SELECT,
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    });
  }

  create(input: DestinationInput, createdById: string | null) {
    return this.prisma.destination.create({
      data: { ...input, createdById },
      select: SELECT,
    });
  }

  async update(id: string, input: DestinationInput) {
    await this.ensureExists(id);
    return this.prisma.destination.update({
      where: { id },
      data: input,
      select: SELECT,
    });
  }

  /** Baja lógica (soft delete) / restauración. No borra: los viajes referencian el destino. */
  async setActive(id: string, isActive: boolean) {
    await this.ensureExists(id);
    return this.prisma.destination.update({
      where: { id },
      data: { isActive },
      select: SELECT,
    });
  }

  private async ensureExists(id: string): Promise<void> {
    const found = await this.prisma.destination.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!found) throw new NotFoundException('El destino no existe');
  }
}

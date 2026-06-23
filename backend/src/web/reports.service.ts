import { Injectable } from '@nestjs/common';
import { Prisma, TripStatus, ClosureType } from '@prisma/client';
import { Workbook } from 'exceljs';
import { PrismaService } from '../prisma/prisma.service';
import { ReportQueryDto } from './dto/report-query.dto';

/**
 * Exportador del reporte de viajes (RN-07). Genera un .xlsx con EXACTAMENTE las
 * 13 columnas del doc §6, en ese orden. Los enums se traducen a su texto en
 * español aquí (no se guardan como texto libre, RN-06).
 */

/** Encabezados exactos del doc §6 (orden = orden de columnas). No tocar sin actualizar el doc. */
export const REPORT_HEADERS = [
  'ID de Viaje',
  'Número de Proveedor',
  'Nombre de Proveedor',
  'Folio de Viaje / Remito',
  'Placa Delantera',
  'Placa Trasera',
  'Destino',
  'Fecha / Hora de Inicio',
  'Fecha / Hora de Fin',
  'Duración Total del Viaje',
  'Estatus del Viaje',
  'Tipo de Cierre',
  'Observaciones',
] as const;

const STATUS_LABEL: Record<TripStatus, string> = {
  EN_RUTA: 'En ruta',
  CONCLUIDO: 'Concluido',
};

const CLOSURE_LABEL: Record<ClosureType, string> = {
  AUTO_GEOFENCE: 'Automático por geocerca',
  MANUAL_OPERATOR: 'Manual por Operador',
  MANUAL_ADMIN: 'Manual por Administrador',
};

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Construye el libro .xlsx con los viajes que cumplen el filtro. */
  async exportXlsx(filter: ReportQueryDto): Promise<Buffer> {
    const where = buildWhere(filter);
    const trips = await this.prisma.trip.findMany({
      where,
      orderBy: { startedAt: 'desc' },
      select: {
        id: true,
        providerNumber: true,
        providerName: true,
        folio: true,
        frontPlate: true,
        rearPlate: true,
        startedAt: true,
        endedAt: true,
        status: true,
        closureType: true,
        observations: true,
        destination: { select: { name: true } },
      },
    });

    const wb = new Workbook();
    const ws = wb.addWorksheet('Viajes');
    ws.addRow([...REPORT_HEADERS]);
    ws.getRow(1).font = { bold: true };

    for (const t of trips) {
      ws.addRow([
        t.id,
        t.providerNumber,
        t.providerName,
        t.folio,
        t.frontPlate,
        t.rearPlate ?? '',
        t.destination?.name ?? '',
        formatDateTime(t.startedAt),
        formatDateTime(t.endedAt),
        formatDuration(t.startedAt, t.endedAt),
        STATUS_LABEL[t.status],
        t.closureType ? CLOSURE_LABEL[t.closureType] : '',
        t.observations ?? '',
      ]);
    }

    const buffer = await wb.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}

function buildWhere(filter: ReportQueryDto): Prisma.TripWhereInput {
  const where: Prisma.TripWhereInput = {};
  if (filter.from || filter.to) {
    where.startedAt = {
      ...(filter.from ? { gte: new Date(filter.from) } : {}),
      ...(filter.to ? { lte: new Date(filter.to) } : {}),
    };
  }
  if (filter.status) where.status = filter.status;
  if (filter.destinationId) where.destinationId = filter.destinationId;
  return where;
}

/** 'DD/MM/AAAA HH:MM' en hora de México (auditoría de fletes). Vacío si null. */
function formatDateTime(d: Date | null): string {
  if (!d) return '';
  const parts = new Intl.DateTimeFormat('es-MX', {
    timeZone: 'America/Mexico_City',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return `${get('day')}/${get('month')}/${get('year')} ${get('hour')}:${get('minute')}`;
}

/** Duración endedAt−startedAt en HH:MM (RN-05, derivada). Vacío si sigue En ruta. */
function formatDuration(startedAt: Date, endedAt: Date | null): string {
  if (!endedAt) return '';
  const ms = endedAt.getTime() - startedAt.getTime();
  if (ms < 0) return '';
  const totalMinutes = Math.floor(ms / 60_000);
  const hh = Math.floor(totalMinutes / 60);
  const mm = totalMinutes % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

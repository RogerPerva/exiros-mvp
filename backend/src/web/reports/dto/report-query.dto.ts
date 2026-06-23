import { IsEnum, IsISO8601, IsOptional, IsUUID } from 'class-validator';
import { TripStatus } from '@prisma/client';

/** Filtros opcionales del reporte (OpenAPI: webExportReport). Todo vacío = todos. */
export class ReportQueryDto {
  /** Desde (inclusive) sobre startedAt, ISO 8601. */
  @IsOptional()
  @IsISO8601()
  from?: string;

  /** Hasta (inclusive) sobre startedAt, ISO 8601. */
  @IsOptional()
  @IsISO8601()
  to?: string;

  @IsOptional()
  @IsEnum(TripStatus)
  status?: TripStatus;

  @IsOptional()
  @IsUUID()
  destinationId?: string;
}

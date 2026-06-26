import { Type } from 'class-transformer';
import {
  IsEnum,
  IsISO8601,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { TripStatus } from '@prisma/client';

/**
 * Filtros + paginación server-side de GET /api/web/trips (OpenAPI: webListTrips).
 * Todo opcional; vacío = primera página sin filtrar. `transform:true` del ValidationPipe
 * convierte page/pageSize (query strings) a número vía @Type.
 */
export class ListTripsQueryDto {
  @IsOptional()
  @IsEnum(TripStatus)
  status?: TripStatus;

  @IsOptional()
  @IsUUID()
  destinationId?: string;

  /** Desde (inclusive) sobre startedAt, ISO 8601. */
  @IsOptional()
  @IsISO8601()
  from?: string;

  /** Hasta (inclusive) sobre startedAt, ISO 8601. */
  @IsOptional()
  @IsISO8601()
  to?: string;

  /** Búsqueda por folio o placa delantera (insensible a mayúsculas). */
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  pageSize?: number;
}

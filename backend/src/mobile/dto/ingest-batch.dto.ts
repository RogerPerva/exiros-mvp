import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsISO8601,
  IsNumber,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/** Un punto de ruta dentro de un lote. Validación estructural (tipos); lo semántico
 * (bbox MX, timestamp no futuro) se filtra por punto en el service. */
export class IngestPointDto {
  @Type(() => Number)
  @IsNumber()
  lat!: number;

  @Type(() => Number)
  @IsNumber()
  lng!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(10000)
  accuracyMeters!: number;

  @IsISO8601()
  recordedAt!: string;
}

/**
 * Lote de ingesta (3.4). Llega comprimido con GZIP (`Content-Encoding: gzip`, que
 * body-parser infla solo). `batchId` (UUID) da idempotencia: reenviar el mismo lote
 * no duplica filas (índice único `tripId+batchId+recordedAt` + `skipDuplicates`).
 */
export class IngestBatchDto {
  @IsUUID()
  batchId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(1000)
  @ValidateNested({ each: true })
  @Type(() => IngestPointDto)
  points!: IngestPointDto[];
}

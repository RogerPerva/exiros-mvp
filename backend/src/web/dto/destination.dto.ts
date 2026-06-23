import {
  IsNumber,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

// Geocerca: radio entero entre 100 y 700 m (decisión PLAN 5.2 + doc UX §6.5).
const RADIUS_MIN = 100;
const RADIUS_MAX = 700;

/** Cuerpo de crear/editar destino (OpenAPI: CreateDestinationRequest). */
export class DestinationDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @IsNumber()
  @Min(-90)
  @Max(90)
  centerLat!: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  centerLng!: number;

  @IsNumber()
  @Min(RADIUS_MIN)
  @Max(RADIUS_MAX)
  radiusMeters!: number;
}

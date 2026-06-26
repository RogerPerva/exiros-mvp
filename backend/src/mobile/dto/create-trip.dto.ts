import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';

/** Cuerpo de POST /api/mobile/trips (7 campos + deviceId + clientRequestId). */
export class CreateTripDto {
  // Doc fuente §3.2/§7.1: "validación estricta de caracteres puramente numéricos".
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  @Matches(/^\d+$/, { message: 'providerNumber debe contener solo dígitos' })
  providerNumber!: string;

  // Doc fuente §3.2: alfanumérico para identificar al vendedor. Letras (incl.
  // acentos/ñ), dígitos, espacios y puntuación básica de razón social (. , & -).
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  @Matches(/^[\p{L}\p{N} .,&-]+$/u, {
    message: 'providerName: solo letras, números, espacios y . , & -',
  })
  providerName!: string;

  // Doc fuente §3.2/§7.1: folio/remito "estrictamente un formato numérico".
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  @Matches(/^\d+$/, { message: 'folio debe contener solo dígitos' })
  folio!: string;

  // Doc fuente §3.2: alfanumérico flexible MX (formatos estatales/federales).
  @IsString()
  @IsNotEmpty()
  @MaxLength(15)
  @Matches(/^[A-Z0-9-]+$/i, {
    message: 'frontPlate: solo letras, números y guiones',
  })
  frontPlate!: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  @Matches(/^[A-Z0-9-]+$/i, {
    message: 'rearPlate: solo letras, números y guiones',
  })
  rearPlate?: string;

  @IsUUID()
  destinationId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  deviceId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  clientRequestId!: string;
}

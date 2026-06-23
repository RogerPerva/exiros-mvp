import { IsISO8601, IsString, IsUUID, MinLength } from 'class-validator';

/** Cuerpo del cierre por operador (CU-05). `endedAt` será el `requestedAt` validado. */
export class MobileCloseTripDto {
  @IsString()
  @MinLength(1)
  observations!: string;

  @IsISO8601()
  requestedAt!: string;

  @IsUUID()
  closeRequestId!: string;
}

import { IsString, MinLength } from 'class-validator';

/** Cuerpo del cierre forzado por admin/monitorista (CU-06). Observación obligatoria. */
export class WebCloseTripDto {
  @IsString()
  @MinLength(1)
  observations!: string;
}

import { Module } from '@nestjs/common';
import { DestinationsService } from './destinations.service';

/** Provee el servicio único de destinos a quien lo importe (mobile + web). */
@Module({
  providers: [DestinationsService],
  exports: [DestinationsService],
})
export class DestinationsModule {}

import { Module } from '@nestjs/common';
import { TripCloseService } from './trip-close.service';

/** Provee la transición de cierre compartida (móvil 4.2 + web 4.3). */
@Module({
  providers: [TripCloseService],
  exports: [TripCloseService],
})
export class TripsModule {}

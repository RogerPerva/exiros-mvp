import { Module } from '@nestjs/common';
import { AppKeyGuard } from '../common/app-key.guard';
import { TripTokenGuard } from '../common/trip-token.guard';
import { DestinationsModule } from '../destinations/destinations.module';
import { TripsModule } from '../trips/trips.module';
import { MobileDestinationsController } from './destinations.controller';
import { MobileTripsController } from './trips.controller';
import { MobileLocationsController } from './locations.controller';
import { MobileCloseController } from './close.controller';
import { TripsService } from './trips.service';
import { LocationsService } from './locations.service';

/** Espacio /api/mobile/* (bootstrap por X-App-Key, ingesta por tripToken). */
@Module({
  imports: [TripsModule, DestinationsModule],
  controllers: [
    MobileDestinationsController,
    MobileTripsController,
    MobileLocationsController,
    MobileCloseController,
  ],
  providers: [AppKeyGuard, TripTokenGuard, TripsService, LocationsService],
})
export class MobileModule {}

import { Module } from '@nestjs/common';
import { TripsModule } from '../trips/trips.module';
import { AuthModule } from '../auth/auth.module';
import { DestinationsModule } from '../destinations/destinations.module';
import { WebTripsController } from './web-trips.controller';
import { WebTripsService } from './web-trips.service';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { WebDestinationsController } from './web-destinations.controller';

/** Espacio /api/web/* (portal de monitoristas). Protegido con JwtAuthGuard (Fase 6.1). */
@Module({
  imports: [TripsModule, AuthModule, DestinationsModule],
  controllers: [
    WebTripsController,
    ReportsController,
    WebDestinationsController,
  ],
  providers: [WebTripsService, ReportsService],
})
export class WebModule {}

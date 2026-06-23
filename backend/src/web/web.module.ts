import { Module } from '@nestjs/common';
import { TripsModule } from '../trips/trips.module';
import { AuthModule } from '../auth/auth.module';
import { DestinationsModule } from '../destinations/destinations.module';
import { WebTripsController } from './trips/web-trips.controller';
import { WebTripsService } from './trips/web-trips.service';
import { ReportsController } from './reports/reports.controller';
import { ReportsService } from './reports/reports.service';
import { WebDestinationsController } from './destinations/web-destinations.controller';
import { WebUsersController } from './users/web-users.controller';
import { UsersService } from './users/users.service';

/** Espacio /api/web/* (portal de monitoristas). Protegido con JwtAuthGuard (Fase 6.1). */
@Module({
  imports: [TripsModule, AuthModule, DestinationsModule],
  controllers: [
    WebTripsController,
    ReportsController,
    WebDestinationsController,
    WebUsersController,
  ],
  providers: [WebTripsService, ReportsService, UsersService],
})
export class WebModule {}

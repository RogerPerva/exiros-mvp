import { Module } from '@nestjs/common';
import { TripsModule } from '../trips/trips.module';
import { AuthModule } from '../auth/auth.module';
import { WebTripsController } from './web-trips.controller';
import { WebTripsService } from './web-trips.service';

/** Espacio /api/web/* (portal de monitoristas). Protegido con JwtAuthGuard (Fase 6.1). */
@Module({
  imports: [TripsModule, AuthModule],
  controllers: [WebTripsController],
  providers: [WebTripsService],
})
export class WebModule {}

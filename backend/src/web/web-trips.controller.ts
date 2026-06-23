import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { TripCloseService } from '../trips/trip-close.service';
import { WebTripsService } from './web-trips.service';
import { WebCloseTripDto } from './dto/web-close.dto';

// TODO Fase 6.1: proteger el espacio /api/web/* con Guard JWT (auth aún no montado).
// Mientras no haya auth, `closedById` queda null (se llenará con el usuario al montar JWT).
@Controller('web/trips')
export class WebTripsController {
  constructor(
    private readonly trips: WebTripsService,
    private readonly closeService: TripCloseService,
  ) {}

  @Get()
  list() {
    return this.trips.findAll();
  }

  /** Cierre forzado por admin (CU-06). Carrera → 409 TRIP_ALREADY_CONCLUDED. */
  @Post(':id/close')
  @HttpCode(200)
  close(@Param('id') id: string, @Body() dto: WebCloseTripDto) {
    return this.closeService.close({
      tripId: id,
      closureType: 'MANUAL_ADMIN',
      observations: dto.observations,
      endedAt: new Date(),
      closedById: null,
    });
  }
}

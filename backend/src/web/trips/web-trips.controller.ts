import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser, JwtAuthGuard } from '../../common/jwt-auth.guard';
import { AdminRolesGuard } from '../../common/roles.guard';
import type { AuthUser } from '../../auth/jwt-payload';
import { TripCloseService } from '../../trips/trip-close.service';
import { WebTripsService } from './web-trips.service';
import { WebCloseTripDto } from './dto/web-close.dto';
import { ListTripsQueryDto } from './dto/list-trips-query.dto';

/** Espacio /api/web/* (portal de monitoristas), protegido con JWT (Fase 6.1). */
@Controller('web/trips')
@UseGuards(JwtAuthGuard)
export class WebTripsController {
  constructor(
    private readonly trips: WebTripsService,
    private readonly closeService: TripCloseService,
  ) {}

  /** W2 tabla: viajes paginados con filtros server-side. Devuelve {data,total,page,pageSize}. */
  @Get()
  list(@Query() query: ListTripsQueryDto) {
    return this.trips.findPage(query);
  }

  /** W1 mapa: feed de monitoreo (arreglo con último punto). Declarado ANTES de :id. */
  @Get('active')
  active() {
    return this.trips.findForMap();
  }

  /** Detalle de un viaje (W3): campos + cierre + foto + ruta. 404 si no existe. */
  @Get(':id')
  detail(@Param('id') id: string) {
    return this.trips.findOne(id);
  }

  /** Cierre forzado por admin (CU-06). Solo ADMIN. Carrera → 409 TRIP_ALREADY_CONCLUDED. */
  @Post(':id/close')
  @UseGuards(AdminRolesGuard)
  @HttpCode(200)
  close(
    @Param('id') id: string,
    @Body() dto: WebCloseTripDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.closeService.close({
      tripId: id,
      closureType: 'MANUAL_ADMIN',
      observations: dto.observations,
      endedAt: new Date(),
      closedById: user.sub,
    });
  }
}

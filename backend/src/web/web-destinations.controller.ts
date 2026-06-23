import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser, JwtAuthGuard } from '../common/jwt-auth.guard';
import { AdminRolesGuard } from '../common/roles.guard';
import type { AuthUser } from '../auth/jwt-payload';
import { DestinationsService } from '../destinations/destinations.service';
import { DestinationDto } from './dto/destination.dto';

/**
 * CRUD de destinos/geocercas (W4 / Fase 5.1). Solo Admin+ (JWT + AdminRolesGuard,
 * validado en backend, no solo oculto en la UI — doc UX §6.1).
 */
@Controller('web/destinations')
@UseGuards(JwtAuthGuard, AdminRolesGuard)
export class WebDestinationsController {
  constructor(private readonly destinations: DestinationsService) {}

  @Get()
  list() {
    return this.destinations.findAllWeb();
  }

  @Post()
  create(@Body() dto: DestinationDto, @CurrentUser() user: AuthUser) {
    return this.destinations.create(dto, user.sub);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: DestinationDto) {
    return this.destinations.update(id, dto);
  }

  /** Baja lógica (soft delete). */
  @Patch(':id/deactivate')
  deactivate(@Param('id') id: string) {
    return this.destinations.setActive(id, false);
  }

  /** Restaurar un destino dado de baja. */
  @Patch(':id/restore')
  restore(@Param('id') id: string) {
    return this.destinations.setActive(id, true);
  }
}

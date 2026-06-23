import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import type { Trip } from '@prisma/client';
import { TripTokenGuard } from '../common/trip-token.guard';
import { TripCloseService } from '../trips/trip-close.service';
import { MobileCloseTripDto } from './dto/mobile-close.dto';

const FUTURE_SKEW_MS = 60_000;

/**
 * POST /api/mobile/trips/:id/close — cierre por operador (CU-05). El `endedAt` real es el
 * `requestedAt` (la hora del intento), no la de reconexión: un cierre offline encolado conserva
 * su hora. Idempotente por `closeRequestId`.
 */
@UseGuards(TripTokenGuard)
@Controller('mobile/trips/:id/close')
export class MobileCloseController {
  constructor(private readonly closeService: TripCloseService) {}

  @Post()
  @HttpCode(200)
  close(
    @Param('id') id: string,
    @Body() dto: MobileCloseTripDto,
    @Req() req: Request & { trip: Trip },
  ) {
    if (req.trip.id !== id) {
      throw new ForbiddenException('El tripToken no corresponde a este viaje');
    }
    const requestedAt = new Date(dto.requestedAt);
    if (requestedAt.getTime() < req.trip.startedAt.getTime()) {
      throw new BadRequestException(
        'requestedAt no puede ser anterior al inicio del viaje',
      );
    }
    if (requestedAt.getTime() > Date.now() + FUTURE_SKEW_MS) {
      throw new BadRequestException('requestedAt no puede estar en el futuro');
    }
    return this.closeService.close({
      tripId: id,
      closureType: 'MANUAL_OPERATOR',
      observations: dto.observations,
      endedAt: requestedAt,
      closeRequestId: dto.closeRequestId,
    });
  }
}

import {
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import type { Trip } from '@prisma/client';
import { TripTokenGuard } from '../common/trip-token.guard';
import { IngestThrottlerGuard } from '../common/ingest-throttler.guard';
import { IngestBatchDto } from './dto/ingest-batch.dto';
import { LocationsService } from './locations.service';

/**
 * POST /api/mobile/trips/:id/locations — ingesta de ruta por lotes GZIP (3.4).
 * Guards (en orden): tripToken (Bearer) resuelve el viaje a `req.trip`; luego el
 * IngestThrottlerGuard aplica el rate-limit por tripToken. El :id de la URL debe
 * coincidir con ese viaje (no se ingiere a un viaje ajeno al token). El cuerpo llega
 * comprimido (`Content-Encoding: gzip`), que body-parser infla antes de validar.
 */
@UseGuards(TripTokenGuard, IngestThrottlerGuard)
@Controller('mobile/trips/:id/locations')
export class MobileLocationsController {
  constructor(private readonly locations: LocationsService) {}

  @Post()
  @HttpCode(200)
  // Límite por tripToken: aprieta el cubo 'ingest' (default 60/min); configurable por env.
  @Throttle({
    ingest: {
      limit: Number(process.env.INGEST_THROTTLE_LIMIT ?? 60),
      ttl: Number(process.env.INGEST_THROTTLE_TTL_MS ?? 60_000),
    },
  })
  add(
    @Param('id') id: string,
    @Body() dto: IngestBatchDto,
    @Req() req: Request & { trip: Trip },
  ) {
    if (req.trip.id !== id) {
      throw new ForbiddenException('El tripToken no corresponde a este viaje');
    }
    return this.locations.addBatch(req.trip, dto);
  }
}

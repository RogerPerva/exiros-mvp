import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * Clave de rate-limit de la ingesta por tripToken. `req.trip` lo deja TripTokenGuard,
 * que resuelve el viaje a partir del Bearer token. Sin viaje resuelto cae a la IP (defensa
 * residual); en la práctica el TripTokenGuard ya rechazó la petición sin token válido.
 */
export function ingestTracker(req: {
  trip?: { id?: string };
  ip?: string;
}): string {
  const tripId = req.trip?.id;
  return tripId ? `ingest:trip:${tripId}` : `ingest:ip:${req.ip ?? 'unknown'}`;
}

/**
 * Rate-limit de ingesta keyeado por tripToken. Se aplica DESPUÉS de TripTokenGuard
 * (que adjunta `req.trip`), por eso vive a nivel de controlador y no como guard global.
 * Una ráfaga con un mismo token agota su propio cubo (429) con independencia de la IP; el
 * límite global por IP (ProxyThrottlerGuard) sigue vigente en paralelo.
 */
@Injectable()
export class IngestThrottlerGuard extends ThrottlerGuard {
  protected getTracker(req: Record<string, unknown>): Promise<string> {
    return Promise.resolve(
      ingestTracker(req as { trip?: { id?: string }; ip?: string }),
    );
  }
}

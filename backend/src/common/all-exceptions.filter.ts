import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { unlink } from 'node:fs/promises';
import type { Request, Response } from 'express';

interface ErrorBody {
  error: string;
  message: string;
  details?: unknown;
}

/**
 * Filtro global (ADR-007 §defensa en capas): formato de error único de PLAN §8
 * `{ error, message, details? }`, log de rechazos, y limpieza del huérfano en
 * `uploads/` cuando un Pipe rechaza una subida ANTES de llegar al service (hueco H3).
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Http');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request & { file?: { path?: string } }>();

    const status = this.resolveStatus(exception);
    const body = this.toBody(exception, status);

    // H3: si la petición subió una foto y terminó en error, borra el huérfano.
    if (status >= 400 && req.file?.path) {
      void unlink(req.file.path).catch(() => undefined);
    }

    // Log de rechazos (sin filtrar datos sensibles del body).
    this.logger.warn(
      `${req.method} ${req.url} → ${status} ${body.error}: ${body.message}`,
    );

    res.status(status).json(body);
  }

  /** HttpException, errores de middleware con status/statusCode (body-parser 413), o 500. */
  private resolveStatus(exception: unknown): number {
    if (exception instanceof HttpException) return exception.getStatus();
    const e = exception as { status?: unknown; statusCode?: unknown };
    if (typeof e?.status === 'number') return e.status;
    if (typeof e?.statusCode === 'number') return e.statusCode;
    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  /** Nombre PascalCase del error a partir del código (PLAN §8). */
  private nameForStatus(status: number): string {
    const map: Record<number, string> = {
      400: 'BadRequest',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'NotFound',
      409: 'Conflict',
      413: 'PayloadTooLarge',
      429: 'TooManyRequests',
    };
    return map[status] ?? (status >= 500 ? 'Internal' : 'Error');
  }

  private toBody(exception: unknown, status: number): ErrorBody {
    if (!(exception instanceof HttpException)) {
      // Errores de middleware (ej. body-parser PayloadTooLargeError) traen status + message.
      const e = exception as { message?: unknown };
      if (status >= 400 && status < 500) {
        return {
          error: this.nameForStatus(status),
          message:
            typeof e?.message === 'string' ? e.message : 'Solicitud rechazada',
        };
      }
      return { error: 'Internal', message: 'Error interno del servidor' };
    }
    const error = exception.constructor.name.replace(/Exception$/, '');
    const resp = exception.getResponse();

    if (typeof resp === 'string') {
      return { error, message: resp };
    }
    const r = resp as { message?: string | string[]; error?: string };
    // class-validator devuelve message: string[] → va a details.
    if (Array.isArray(r.message)) {
      return {
        error,
        message: 'La solicitud no pasó la validación',
        details: { errores: r.message },
      };
    }
    return {
      error,
      message: typeof r.message === 'string' ? r.message : (r.error ?? error),
    };
  }
}

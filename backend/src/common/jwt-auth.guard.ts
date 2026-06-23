import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  createParamDecorator,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import type { AuthUser, JwtPayload } from '../auth/jwt-payload';

/**
 * Guard del espacio /api/web/* (ADR-007): exige `Authorization: Bearer <jwt>`.
 * Verifica firma + expiración con JwtService y adjunta el payload a `req.user`.
 * Se aplica explícitamente por controlador web (no global) para no tocar la
 * superficie pública móvil ni el propio login.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthUser }>();
    const auth = req.header('authorization') ?? '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
    if (!token) throw new UnauthorizedException('Falta token de sesión');

    try {
      req.user = await this.jwt.verifyAsync<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException('Token inválido o expirado');
    }
    return true;
  }
}

/** `@CurrentUser()` → el AuthUser que el guard adjuntó a la request. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthUser => {
    const req = context
      .switchToHttp()
      .getRequest<Request & { user: AuthUser }>();
    return req.user;
  },
);

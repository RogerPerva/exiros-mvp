import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import type { Role } from '@prisma/client';
import type { AuthUser } from '../auth/jwt-payload';

/** Roles con acceso administrativo (Destinos/Usuarios). */
const ADMIN_ROLES: Role[] = ['ADMIN'];

/**
 * Exige rol administrativo. Va DESPUÉS de JwtAuthGuard (que adjunta req.user).
 * El doc UX §6.1 exige validar el permiso en el backend, no solo ocultar en la UI.
 */
@Injectable()
export class AdminRolesGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthUser }>();
    if (!req.user || !ADMIN_ROLES.includes(req.user.role)) {
      throw new ForbiddenException('Requiere rol administrador');
    }
    return true;
  }
}

import type { Role } from '@prisma/client';

/** Contenido del JWT del staff web (ADR-007). `sub` = User.id. */
export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
}

/** Usuario autenticado que el JwtAuthGuard adjunta a `req.user`. */
export type AuthUser = JwtPayload;

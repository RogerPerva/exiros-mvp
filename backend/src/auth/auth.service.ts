import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import type { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload } from './jwt-payload';

/** Usuario sin passwordHash (OpenAPI: UserPublic). */
export type UserPublic = Omit<User, 'passwordHash'>;

export interface LoginResult {
  accessToken: string;
  user: UserPublic;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  /**
   * Valida credenciales y emite JWT. El mensaje de error es genérico y la
   * verificación de password se ejecuta SIEMPRE (aun si el email no existe) para
   * no filtrar por timing si una cuenta existe (OpenAPI: 401 genérico).
   */
  async login(email: string, password: string): Promise<LoginResult> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    // Hash dummy con el mismo coste para igualar el tiempo cuando el email no existe.
    const hash = user?.passwordHash ?? DUMMY_HASH;
    const ok = await bcrypt.compare(password, hash);
    if (!user || !user.isActive || !ok) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    const accessToken = await this.jwt.signAsync(payload);
    return { accessToken, user: toPublic(user) };
  }

  /** Perfil del usuario actual (`GET /web/auth/me`). */
  async me(userId: string): Promise<UserPublic> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Sesión inválida');
    }
    return toPublic(user);
  }
}

function toPublic(user: User): UserPublic {
  const { passwordHash: _omit, ...rest } = user;
  void _omit;
  return rest;
}

// Hash real (coste 10) generado al cargar el módulo: iguala el tiempo del compare
// cuando el email no existe, para no filtrar la existencia de la cuenta por timing.
const DUMMY_HASH = bcrypt.hashSync('dummy-password-not-used', 10);

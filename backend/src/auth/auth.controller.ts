import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser, JwtAuthGuard } from '../common/jwt-auth.guard';
import type { AuthUser } from './jwt-payload';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

/** Auth del staff web (OpenAPI: Auth (web)). Rutas reales bajo prefijo /api. */
@Controller('web/auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** Público. Login email+password → JWT. 401 genérico si falla (no filtra).
   *  Throttle estricto (10/min) anti fuerza-bruta, sobre el global de 100/min. */
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password);
  }

  /** Perfil del usuario autenticado. */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.sub);
  }
}

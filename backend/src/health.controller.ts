import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { PrismaService } from './prisma/prisma.service';

/**
 * Sonda de salud (H6) para el auditor / monitor / cloudflared en el EC2.
 * `/api/health` (prefijo global `api`). Sin guards: público y exento del rate-limit.
 * Readiness real: hace un `SELECT 1` → 200 si la DB responde, 503 si no.
 */
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async check(): Promise<{ status: string; db: string; uptime: number }> {
    let db = 'up';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      db = 'down';
    }
    return {
      status: db === 'up' ? 'ok' : 'degraded',
      db,
      uptime: process.uptime(),
    };
  }
}

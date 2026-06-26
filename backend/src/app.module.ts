import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ThrottlerModule } from '@nestjs/throttler';
import { join } from 'node:path';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { MobileModule } from './mobile/mobile.module';
import { WebModule } from './web/web.module';
import { HealthController } from './health.controller';
import { ProxyThrottlerGuard } from './common/proxy-throttler.guard';

/** Falla rápido al arranque si faltan secretos críticos (en vez de degradar en silencio). */
function validateEnv(config: Record<string, unknown>): Record<string, unknown> {
  const required = [
    'DATABASE_URL',
    'JWT_SECRET',
    'TRIP_TOKEN_SECRET',
    'APP_KEY',
  ];
  const missing = required.filter((key) => !config[key]);
  if (missing.length > 0) {
    throw new Error(
      `Faltan variables de entorno requeridas: ${missing.join(', ')}`,
    );
  }
  return config;
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    // Rate-limit global (ADR-007): el endpoint público móvil es la mayor superficie
    // de ataque. 100 req/min por IP por defecto; configurable por env para afinar.
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: Number(process.env.THROTTLE_TTL_MS ?? 60_000),
        limit: Number(process.env.THROTTLE_LIMIT ?? 100),
      },
      // Cubo 'ingest': lo aprieta por tripToken el IngestThrottlerGuard en el controlador
      // de ingesta (H-3). Aquí queda casi no-op para no afectar otras rutas.
      {
        name: 'ingest',
        ttl: Number(process.env.THROTTLE_TTL_MS ?? 60_000),
        limit: 1_000_000,
      },
    ]),
    // Sirve las fotos subidas (MVP en disco local) en /uploads/<archivo>.
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),
    PrismaModule,
    AuthModule,
    MobileModule,
    WebModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ProxyThrottlerGuard }],
})
export class AppModule {}

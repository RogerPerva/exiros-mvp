import { NestFactory } from '@nestjs/core';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { json, urlencoded } from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/all-exceptions.filter';

const JSON_BODY_LIMIT = '256kb';

/**
 * Configuración compartida por bootstrap y por los tests e2e (para que los e2e
 * ejerciten la MISMA app endurecida): defensa en capas de ADR-007.
 */
export function setupApp(app: INestApplication): void {
  // helmet: cabeceras seguras. CORP cross-origin para que el portal (otro origen)
  // pueda cargar las fotos servidas en /uploads.
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  // Tope de body JSON (las fotos van por multipart/multer con su propio límite de 5MB).
  app.use(json({ limit: JSON_BODY_LIMIT }));
  app.use(urlencoded({ extended: true, limit: JSON_BODY_LIMIT }));

  app.enableCors({ origin: process.env.WEB_ORIGIN ?? true });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
}

async function bootstrap() {
  // bodyParser: false → registramos json/urlencoded nosotros con límite (setupApp).
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  setupApp(app);
  await app.listen(process.env.PORT ?? 3000);
}

// Solo arranca el server si se ejecuta directamente (no al importar setupApp en los e2e).
if (require.main === module) {
  void bootstrap();
}

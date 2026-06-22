import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'node:path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { MobileModule } from './mobile/mobile.module';
import { WebModule } from './web/web.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Sirve las fotos subidas (MVP en disco local) en /uploads/<archivo>.
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),
    PrismaModule,
    MobileModule,
    WebModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

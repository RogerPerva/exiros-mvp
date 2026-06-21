import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/** Global para que cualquier módulo inyecte PrismaService sin reimportarlo. */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}

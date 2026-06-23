import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';

const SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  isActive: true,
  createdAt: true,
} as const;

interface CreateUserInput {
  name: string;
  email: string;
  role: Role;
  password: string;
}
interface UpdateUserInput {
  name: string;
  role: Role;
}

/** Gestión de usuarios del staff (W5 / Fase 6.2). El Super admin está protegido. */
@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.user.findMany({
      select: SELECT,
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
    });
  }

  async create(input: CreateUserInput, createdById: string | null) {
    const passwordHash = await bcrypt.hash(input.password, 10);
    try {
      return await this.prisma.user.create({
        data: {
          name: input.name,
          email: input.email,
          role: input.role,
          passwordHash,
          createdById,
        },
        select: SELECT,
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException('Ya existe un usuario con ese correo');
      }
      throw e;
    }
  }

  async update(id: string, input: UpdateUserInput) {
    await this.ensureExists(id);
    return this.prisma.user.update({
      where: { id },
      data: { name: input.name, role: input.role },
      select: SELECT,
    });
  }

  /** Baja lógica (soft delete). */
  async setActive(id: string, isActive: boolean) {
    await this.ensureExists(id);
    return this.prisma.user.update({
      where: { id },
      data: { isActive },
      select: SELECT,
    });
  }

  private async ensureExists(id: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!user) throw new NotFoundException('El usuario no existe');
  }
}

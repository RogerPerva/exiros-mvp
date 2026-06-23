import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';

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

/** Gestión de usuarios del staff (W5 / Fase 6.2). Protege contra dejar la plataforma
 *  sin administradores activos (auto-baja, auto-degradación, degradar al último ADMIN). */
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

  async update(id: string, input: UpdateUserInput, currentUserId: string) {
    const target = await this.getOrThrow(id);
    // No puedes quitarte a ti mismo el rol de administrador.
    if (id === currentUserId && input.role !== Role.ADMIN) {
      throw new BadRequestException(
        'No puedes quitarte a ti mismo el rol de administrador',
      );
    }
    // No degradar al último administrador activo.
    if (
      target.role === Role.ADMIN &&
      target.isActive &&
      input.role !== Role.ADMIN
    ) {
      await this.assertNotLastAdmin(id);
    }
    return this.prisma.user.update({
      where: { id },
      data: { name: input.name, role: input.role },
      select: SELECT,
    });
  }

  /** Baja lógica (soft delete). */
  async setActive(id: string, isActive: boolean, currentUserId?: string) {
    const target = await this.getOrThrow(id);
    if (!isActive) {
      if (id === currentUserId) {
        throw new BadRequestException('No puedes darte de baja a ti mismo');
      }
      if (target.role === Role.ADMIN && target.isActive) {
        await this.assertNotLastAdmin(id);
      }
    }
    return this.prisma.user.update({
      where: { id },
      data: { isActive },
      select: SELECT,
    });
  }

  private async getOrThrow(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, isActive: true },
    });
    if (!user) throw new NotFoundException('El usuario no existe');
    return user;
  }

  /** Lanza si `id` es el único administrador activo (evita dejar la plataforma sin admins). */
  private async assertNotLastAdmin(id: string): Promise<void> {
    const otherActiveAdmins = await this.prisma.user.count({
      where: { role: Role.ADMIN, isActive: true, id: { not: id } },
    });
    if (otherActiveAdmins === 0) {
      throw new ConflictException(
        'No puedes dejar la plataforma sin administradores activos',
      );
    }
  }
}

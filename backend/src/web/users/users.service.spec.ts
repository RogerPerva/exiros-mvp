import { BadRequestException, ConflictException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { UsersService } from './users.service';

/** Invariantes de seguridad (Batch A #1): no auto-baja, no auto-degradación, no dejar la
 *  plataforma sin administradores activos. Prisma mockeado (sin DB). */
describe('UsersService — invariantes de administradores', () => {
  let prisma: {
    user: { findUnique: jest.Mock; update: jest.Mock; count: jest.Mock };
  };
  let service: UsersService;

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({ id: 'u1' }),
        count: jest.fn(),
      },
    };
    service = new UsersService(prisma as never);
  });

  it('un admin no puede quitarse a sí mismo el rol (auto-degradación) → BadRequest', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      role: Role.ADMIN,
      isActive: true,
    });
    await expect(
      service.update('u1', { name: 'Yo', role: Role.MONITOR }, 'u1'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('un usuario no puede darse de baja a sí mismo → BadRequest', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      role: Role.ADMIN,
      isActive: true,
    });
    await expect(service.setActive('u1', false, 'u1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('no se puede degradar al último administrador activo → Conflict', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'u2',
      role: Role.ADMIN,
      isActive: true,
    });
    prisma.user.count.mockResolvedValue(0); // no hay otros admins activos
    await expect(
      service.update('u2', { name: 'Otro', role: Role.MONITOR }, 'admin'),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('no se puede dar de baja al último administrador activo → Conflict', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'u2',
      role: Role.ADMIN,
      isActive: true,
    });
    prisma.user.count.mockResolvedValue(0);
    await expect(
      service.setActive('u2', false, 'admin'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('sí permite dar de baja a un admin si queda otro activo', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'u2',
      role: Role.ADMIN,
      isActive: true,
    });
    prisma.user.count.mockResolvedValue(1); // queda otro admin activo
    await service.setActive('u2', false, 'admin');
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { isActive: false } }),
    );
  });
});

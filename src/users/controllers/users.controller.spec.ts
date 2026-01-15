import { Test } from '@nestjs/testing';
import { UsuariosController } from '@/users/controllers/users.controller';
import { UsuariosService } from '@/users/users.service';
import { Papel } from '@prisma/client';
import { ForbiddenException } from '@nestjs/common';

describe('UsuariosController', () => {
  let controller: UsuariosController;
  const mockService: any = {
    findAll: jest.fn().mockResolvedValue([]),
    requireById: jest
      .fn()
      .mockImplementation((id) => Promise.resolve({ id, login: 'u' })),
    update: jest
      .fn()
      .mockImplementation((id, dto) => Promise.resolve({ id, ...dto })),
    updateRole: jest.fn().mockResolvedValue({ ok: true }),
    remove: jest.fn().mockResolvedValue({ ok: true }),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [UsuariosController],
      providers: [{ provide: UsuariosService, useValue: mockService }],
    }).compile();
    controller = moduleRef.get(UsuariosController);
  });

  afterEach(() => jest.clearAllMocks());

  it('findAll delegates to service', async () => {
    const res = await controller.findAll();
    expect(res).toEqual([]);
    expect(mockService.findAll).toHaveBeenCalled();
  });

  describe('findOne', () => {
    it('returns when owner', async () => {
      const user = { id: 1, papel: Papel.ESTUDANTE } as any;
      const res = await controller.findOne(1, { user } as any);
      expect(res).toHaveProperty('id', 1);
      expect(mockService.requireById).toHaveBeenCalledWith(1);
    });

    it('throws when not owner and not admin', async () => {
      const user = { id: 2, papel: Papel.ESTUDANTE } as any;
      await expect(
        controller.findOne(1, { user } as any),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('allows admin', async () => {
      const user = { id: 2, papel: Papel.ADMINISTRADOR } as any;
      const res = await controller.findOne(1, { user } as any);
      expect(res).toHaveProperty('id', 1);
    });
  });

  describe('updateProfile', () => {
    it('allows owner update', async () => {
      const user = { id: 3, papel: Papel.ESTUDANTE } as any;
      const dto = { nome: 'Novo' } as any;
      const res = await controller.updateProfile(3, dto, { user } as any);
      expect(res).toHaveProperty('nome', 'Novo');
      expect(mockService.update).toHaveBeenCalledWith(3, dto);
    });

    it('forbids other users', async () => {
      const user = { id: 4, papel: Papel.ESTUDANTE } as any;
      await expect(
        controller.updateProfile(5, { nome: 'X' } as any, { user } as any),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  it('setRole delegates to service', async () => {
    await controller.setRole(1, { papel: Papel.BOLSISTA } as any);
    expect(mockService.updateRole).toHaveBeenCalledWith(1, Papel.BOLSISTA);
  });

  describe('remove', () => {
    it('allows owner to remove', async () => {
      const user = { id: 7, papel: Papel.ESTUDANTE } as any;
      await controller.remove(7, { user } as any);
      expect(mockService.remove).toHaveBeenCalledWith(7);
    });

    it('forbids non-owner non-admin', async () => {
      const user = { id: 8, papel: Papel.ESTUDANTE } as any;
      await expect(
        controller.remove(9, { user } as any),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('allows admin to remove', async () => {
      const user = { id: 10, papel: Papel.ADMINISTRADOR } as any;
      await controller.remove(11, { user } as any);
      expect(mockService.remove).toHaveBeenCalledWith(11);
    });
  });
});

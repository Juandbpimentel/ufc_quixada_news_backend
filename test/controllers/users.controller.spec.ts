import { Test } from '@nestjs/testing';
import { UsuariosController } from '@/users/controllers/users.controller';
import { UsuariosService } from '@/users/users.service';
import { ForbiddenException } from '@nestjs/common';

describe('UsuariosController', () => {
  let controller: UsuariosController;
  const mockSvc: any = {
    findAll: jest.fn().mockResolvedValue([{ id: 1 }]),
    requireById: jest.fn().mockResolvedValue({ id: 2 }),
    update: jest.fn().mockResolvedValue({ id: 2 }),
    updateRole: jest.fn().mockResolvedValue({ id: 3 }),
    remove: jest.fn().mockResolvedValue({ id: 4 }),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [UsuariosController],
      providers: [{ provide: UsuariosService, useValue: mockSvc }],
    }).compile();
    controller = moduleRef.get(UsuariosController);
  });

  afterEach(() => jest.clearAllMocks());

  it('findAll calls service', async () => {
    const res = await controller.findAll();
    expect(Array.isArray(res)).toBe(true);
  });

  it('findOne throws when not owner and not admin', async () => {
    await expect(
      controller.findOne(2, { user: { id: 3, papel: 'ESTUDANTE' } } as any),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('findOne returns user when allowed', async () => {
    const res = await controller.findOne(2, {
      user: { id: 2, papel: 'ESTUDANTE' },
    } as any);
    expect(res).toHaveProperty('id');
  });

  it('updateProfile requires permission and calls update', async () => {
    await expect(
      controller.updateProfile(
        1,
        { nome: 'x' } as any,
        { user: { id: 2, papel: 'ESTUDANTE' } } as any,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

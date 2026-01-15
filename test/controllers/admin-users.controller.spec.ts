import { Test } from '@nestjs/testing';
import { AdminUsuariosController } from '@/users/controllers/admin-users.controller';
import { UsuariosService } from '@/users/users.service';

describe('AdminUsuariosController', () => {
  let controller: AdminUsuariosController;
  const mockSvc: any = {
    createWithRoleAndExtension: jest
      .fn()
      .mockResolvedValue({ id: 5, login: 'u' }),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AdminUsuariosController],
      providers: [{ provide: UsuariosService, useValue: mockSvc }],
    }).compile();
    controller = moduleRef.get(AdminUsuariosController);
  });

  it('create returns user response', async () => {
    const res = await controller.create({
      login: 'u',
      email: 'e',
      nome: 'n',
      senha: 's',
      papel: 'VISITANTE',
    } as any);
    expect(res).toHaveProperty('id');
  });
});

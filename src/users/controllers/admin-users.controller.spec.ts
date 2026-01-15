jest.mock('bcrypt', () => ({ hash: jest.fn(), compare: jest.fn() }));
import * as bcrypt from 'bcrypt';
import { Test } from '@nestjs/testing';
import { AdminUsuariosController } from '@/users/controllers/admin-users.controller';
import { UsuariosService } from '@/users/users.service';

describe('AdminUsuariosController', () => {
  let controller: AdminUsuariosController;
  const mockUsuarios: any = {
    createWithRoleAndExtension: jest
      .fn()
      .mockResolvedValue({ id: 5, login: 'u', senhaHash: 'HASH', nome: 'U' }),
  };

  beforeAll(async () => {
    (bcrypt.hash as jest.Mock).mockResolvedValue('HASH');
    const moduleRef = await Test.createTestingModule({
      controllers: [AdminUsuariosController],
      providers: [{ provide: UsuariosService, useValue: mockUsuarios }],
    }).compile();

    controller = moduleRef.get(AdminUsuariosController);
  });

  afterEach(() => jest.clearAllMocks());

  it('create hashes password and returns public user', async () => {
    const dto: any = {
      login: 'x',
      email: 'x@x',
      nome: 'N',
      senha: 's',
      papel: 'BOLSISTA',
    };
    const res = await controller.create(dto);
    expect(bcrypt.hash).toHaveBeenCalledWith('s', 10);
    expect(mockUsuarios.createWithRoleAndExtension).toHaveBeenCalled();
    expect(res).not.toHaveProperty('senhaHash');
    expect(res).toHaveProperty('id', 5);
  });
});

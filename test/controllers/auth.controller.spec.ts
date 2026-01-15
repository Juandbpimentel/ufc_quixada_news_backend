import { Test } from '@nestjs/testing';
import { AuthController } from '@/auth/controllers/auth.controller';
import { AuthService } from '@/auth/services/auth.service';
import { PasswordResetService } from '@/auth/password-reset.service';
import { UsuariosService } from '@/users/users.service';

describe('AuthController', () => {
  let controller: AuthController;
  const mockAuthService: any = {
    loginFromGuard: jest.fn().mockReturnValue({
      token: 'jwt.token',
      user: { id: 1, login: 'u', nome: 'U', papel: 'ESTUDANTE' },
    }),
    register: jest.fn().mockResolvedValue({
      token: 'jwt.token',
      user: { id: 2, login: 'new', nome: 'New', papel: 'VISITANTE' },
    }),
  };
  const mockPasswordReset: any = {
    requestReset: jest.fn(),
    resetPassword: jest.fn(),
  };
  const mockUsuarios: any = { rotateTokenVersion: jest.fn() };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: PasswordResetService, useValue: mockPasswordReset },
        { provide: UsuariosService, useValue: mockUsuarios },
      ],
    }).compile();

    controller = moduleRef.get(AuthController);
  });

  afterEach(() => jest.clearAllMocks());

  it('login should return token and user', () => {
    const req: any = { user: { id: 1 } };
    const res = controller.login({} as any, req);
    expect(res).toHaveProperty('token');
    expect(res).toHaveProperty('user');
  });

  it('register should return token and user', async () => {
    const dto = {
      login: 'new',
      email: 'x@x',
      nome: 'New',
      senha: 'pass',
    } as any;
    const res = await controller.register(dto);
    expect(res).toHaveProperty('token');
    expect(res.user.login).toBe('new');
  });

  it('logout should call rotateTokenVersion', async () => {
    const req: any = { user: { id: 1 } } as any;
    await controller.logout(req);
    expect(mockUsuarios.rotateTokenVersion).toHaveBeenCalledWith(1);
  });

  it('forgotPassword should call passwordReset service', async () => {
    await controller.forgotPassword({ email: 'noone@example.com' } as any);
    expect(mockPasswordReset.requestReset).toHaveBeenCalledWith(
      'noone@example.com',
    );
  });
});

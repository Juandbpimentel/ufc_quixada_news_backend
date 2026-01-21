import { Test } from '@nestjs/testing';
import { AuthController } from '@/auth/controllers/auth.controller';
import { AuthService } from '@/auth/services/auth.service';
import { PasswordResetService } from '@/auth/password-reset.service';
import { UsuariosService } from '@/users/users.service';
import { SolicitacoesService } from '@/users/solicitacoes.service';
import { StatusSolicitacao } from '@prisma/client';

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
  const mockUsuarios: any = {
    rotateTokenVersion: jest.fn(),
    findOne: jest.fn(),
  };
  const mockSolicitacoes: any = { listOwn: jest.fn() };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: PasswordResetService, useValue: mockPasswordReset },
        { provide: UsuariosService, useValue: mockUsuarios },
        { provide: SolicitacoesService, useValue: mockSolicitacoes },
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

  it('getProfile sets isApproved=true when user has an accepted solicitation (papel not updated)', async () => {
    // user is still VISITANTE but has an accepted solicitation in the DB
    const req: any = {
      user: {
        id: 99,
        login: 'pending-admin-created',
        nome: 'Pending',
        papel: 'VISITANTE',
        criadoEm: new Date().toISOString(),
        atualizadoEm: new Date().toISOString(),
      },
    };
    mockUsuarios.findOne.mockResolvedValueOnce(null);
    mockSolicitacoes.listOwn.mockResolvedValueOnce([
      { id: 3, usuarioId: 99, status: StatusSolicitacao.ACEITA },
    ]);

    const res: any = await controller.getProfile(req);
    expect(res.isApproved).toBe(true);
  });

  it('getProfile uses DB papel when token is stale (admin changed role)', async () => {
    const req: any = {
      user: {
        id: 77,
        login: 'stale-token',
        nome: 'Stale',
        papel: 'VISITANTE',
        criadoEm: new Date().toISOString(),
        atualizadoEm: new Date().toISOString(),
      },
    };

    // DB shows the up-to-date papel even though token is stale
    mockUsuarios.findOne.mockResolvedValueOnce({
      id: 77,
      login: 'stale-token',
      nome: 'Stale',
      papel: 'PROFESSOR',
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString(),
    });
    mockSolicitacoes.listOwn.mockResolvedValueOnce([]);

    const res: any = await controller.getProfile(req);
    expect(res.papel).toBe('PROFESSOR');
    expect(res.isApproved).toBe(true);
  });

  it('getProfile treats TECNICO_ADMINISTRATIVO as approved (fast path)', async () => {
    const req: any = {
      user: {
        id: 56,
        login: 'tech',
        nome: 'Tech',
        papel: 'TECNICO_ADMINISTRATIVO',
        criadoEm: new Date().toISOString(),
        atualizadoEm: new Date().toISOString(),
      },
    };
    mockSolicitacoes.listOwn.mockResolvedValueOnce([]);

    const res: any = await controller.getProfile(req);
    expect(res.isApproved).toBe(true);
  });
});

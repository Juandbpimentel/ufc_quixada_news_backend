import { Test } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsuariosService } from '@/users/users.service';
import { JwtService } from '@nestjs/jwt';
import { SolicitacoesService } from '@/users/solicitacoes.service';

// mock bcrypt to allow setting return values safely
jest.mock('bcrypt', () => ({ compare: jest.fn(), hash: jest.fn() }));
import * as bcrypt from 'bcrypt';
import { BadRequestException } from '@nestjs/common';

describe('AuthService', () => {
  let service: AuthService;
  const mockUsuarios: any = {
    findByLogin: jest.fn(),
    create: jest
      .fn()
      .mockImplementation((u) => Promise.resolve({ id: 99, ...u })),
  };
  const mockJwt: any = { sign: jest.fn().mockReturnValue('signed') };
  const mockSolicitacoes: any = { createOrReopenSolicitacao: jest.fn() };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsuariosService, useValue: mockUsuarios },
        { provide: JwtService, useValue: mockJwt },
        { provide: SolicitacoesService, useValue: mockSolicitacoes },
      ],
    }).compile();
    service = moduleRef.get(AuthService);
  });

  afterEach(() => jest.clearAllMocks());

  it('validateUser returns user when password matches', async () => {
    const fake = { id: 1, login: 'u', senhaHash: '$2b$10$aaa' } as any;
    mockUsuarios.findByLogin.mockResolvedValueOnce(fake);
    (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);

    const res = await service.validateUser('u', 'pass');
    expect(res).toEqual(fake);
  });

  it('login throws on invalid credentials', async () => {
    mockUsuarios.findByLogin.mockResolvedValueOnce(null);
    await expect(
      service.login({ login: 'x', senha: 'y' } as any),
    ).rejects.toThrow();
  });

  it('login returns token and user on success', async () => {
    const fake = {
      id: 2,
      login: 'ok',
      senhaHash: 'h',
      nome: 'N',
      email: 'e',
      papel: 'VISITANTE',
      versaoToken: 1,
    } as any;
    mockUsuarios.findByLogin.mockResolvedValueOnce(fake);
    (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);

    const res = await service.login({ login: 'ok', senha: 'x' } as any);
    expect(res).toHaveProperty('token', 'signed');
    expect(res.user).toHaveProperty('id', 2);
    expect(mockJwt.sign).toHaveBeenCalled();
  });

  it('register validates institutional emails and creates solicitacao for bolsista', async () => {
    (bcrypt.hash as jest.Mock).mockResolvedValueOnce('HASH');
    // invalid docente email
    await expect(
      service.register({
        login: 'l',
        email: 'x@x',
        nome: 'n',
        senha: 's',
        perfil: 'docente',
      } as any),
    ).rejects.toBeInstanceOf(BadRequestException);

    // valid bolsista should call solicitacoes
    await service.register({
      login: 'l2',
      email: 'y@alu.ufc.br',
      nome: 'n',
      senha: 's',
      perfil: 'bolsista',
    } as any);
    expect(mockUsuarios.create).toHaveBeenCalled();
    expect(mockSolicitacoes.createOrReopenSolicitacao).toHaveBeenCalled();
  });
});

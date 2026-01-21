import { Test } from '@nestjs/testing';
import { UsuariosService } from './users.service';
import { PrismaService } from '@/prisma/prisma.service';
import { Papel, StatusSolicitacao } from '@prisma/client';

describe('UsuariosService', () => {
  let service: UsuariosService;

  const mockPrisma: any = {
    usuario: { create: jest.fn(), findFirst: jest.fn() },
    bolsista: { findUnique: jest.fn(), create: jest.fn() },
    professor: { findUnique: jest.fn(), create: jest.fn() },
    tecnicoAdministrativo: { findUnique: jest.fn(), create: jest.fn() },
    solicitacao: { findUnique: jest.fn(), update: jest.fn() },
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        UsuariosService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = moduleRef.get(UsuariosService);
  });

  afterEach(() => jest.clearAllMocks());

  it('createWithRoleAndExtension accepts existing pending solicitation for BOLSISTA', async () => {
    mockPrisma.usuario.findFirst.mockResolvedValueOnce(null);
    mockPrisma.usuario.create.mockResolvedValueOnce({ id: 42, login: 'x' });
    mockPrisma.solicitacao.findUnique.mockResolvedValueOnce({
      id: 9,
      usuarioId: 42,
      status: StatusSolicitacao.PENDENTE,
      tipo: 'BOLSISTA',
    });
    mockPrisma.bolsista.findUnique.mockResolvedValueOnce(null);
    mockPrisma.bolsista.create.mockResolvedValueOnce({ id: 1, usuarioId: 42 });

    const res = await service.createWithRoleAndExtension({
      login: 'x',
      email: 'e',
      nome: 'n',
      senhaHash: 'h',
      papel: Papel.BOLSISTA,
      bolsista: { programaBolsista: 'p' },
    } as any);

    expect(mockPrisma.usuario.create).toHaveBeenCalled();
    expect(mockPrisma.solicitacao.findUnique).toHaveBeenCalledWith({
      where: { usuarioId: 42 },
    });
    expect(mockPrisma.solicitacao.update).toHaveBeenCalledWith({
      where: { usuarioId: 42 },
      data: { status: StatusSolicitacao.ACEITA, aprovadorId: null },
    });
    expect(res).toHaveProperty('id', 42);
  });

  it('createWithRoleAndExtension does not touch solicitation when none exists', async () => {
    mockPrisma.usuario.findFirst.mockResolvedValueOnce(null);
    mockPrisma.usuario.create.mockResolvedValueOnce({ id: 43, login: 'y' });
    mockPrisma.solicitacao.findUnique.mockResolvedValueOnce(null);

    const res = await service.createWithRoleAndExtension({
      login: 'y',
      email: 'e2',
      nome: 'n2',
      senhaHash: 'h2',
      papel: Papel.VISITANTE,
    } as any);

    expect(mockPrisma.solicitacao.findUnique).toHaveBeenCalledWith({
      where: { usuarioId: 43 },
    });
    expect(mockPrisma.solicitacao.update).not.toHaveBeenCalled();
    expect(res).toHaveProperty('id', 43);
  });
});

import { Test } from '@nestjs/testing';
import { SolicitacoesService } from './solicitacoes.service';
import { PrismaService } from '@/prisma/prisma.service';
import { StatusSolicitacao } from '@prisma/client';

describe('SolicitacoesService', () => {
  let service: SolicitacoesService;

  const mockPrisma: any = {
    solicitacao: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    bolsista: { findUnique: jest.fn(), create: jest.fn() },
    professor: { findUnique: jest.fn(), create: jest.fn() },
    tecnicoAdministrativo: { findUnique: jest.fn(), create: jest.fn() },
    usuario: { update: jest.fn() },
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        SolicitacoesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = moduleRef.get(SolicitacoesService);
  });

  afterEach(() => jest.clearAllMocks());

  it('createOrReopen creates when none exists', async () => {
    mockPrisma.solicitacao.findUnique.mockResolvedValueOnce(null);
    mockPrisma.solicitacao.create.mockResolvedValueOnce({
      id: 1,
      usuarioId: 2,
      tipo: 'BOLSISTA',
    });

    const res = await service.createOrReopenSolicitacao(2, {
      tipo: 'BOLSISTA',
      mensagem: 'x',
    } as any);
    expect(mockPrisma.solicitacao.create).toHaveBeenCalled();
    expect(res).toHaveProperty('id', 1);
  });

  it('createOrReopen throws when existing is pending', async () => {
    mockPrisma.solicitacao.findUnique.mockResolvedValueOnce({
      id: 2,
      status: StatusSolicitacao.PENDENTE,
    });
    await expect(
      service.createOrReopenSolicitacao(2, { tipo: 'BOLSISTA' } as any),
    ).rejects.toThrow();
  });

  it('createOrReopen reopens when rejected', async () => {
    mockPrisma.solicitacao.findUnique.mockResolvedValueOnce({
      id: 3,
      status: StatusSolicitacao.REJEITADA,
    });
    mockPrisma.solicitacao.update.mockResolvedValueOnce({
      id: 3,
      status: StatusSolicitacao.PENDENTE,
    });
    const res = await service.createOrReopenSolicitacao(3, {
      tipo: 'PROFESSOR',
      mensagem: 'x',
    } as any);
    expect(mockPrisma.solicitacao.update).toHaveBeenCalled();
    expect(res.status).toBe(StatusSolicitacao.PENDENTE);
  });

  it("listOwn returns user's solicitation as an array", async () => {
    mockPrisma.solicitacao.findUnique.mockResolvedValueOnce({
      id: 4,
      usuarioId: 4,
    });
    const res = await service.listOwn(4);
    expect(Array.isArray(res)).toBe(true);
    expect(res[0]).toHaveProperty('id', 4);
  });

  it('listPendingFor returns array', async () => {
    mockPrisma.solicitacao.findMany.mockResolvedValueOnce([{ id: 5 }]);
    const res = await service.listPendingFor();
    expect(Array.isArray(res)).toBe(true);
  });

  it('setStatus returns null if not found', async () => {
    mockPrisma.solicitacao.findUnique.mockResolvedValueOnce(null);
    const res = await service.setStatus(99, StatusSolicitacao.ACEITA, 1);
    expect(res).toBeNull();
  });

  it('setStatus accepts BOLSISTA and promotes user', async () => {
    mockPrisma.solicitacao.findUnique.mockResolvedValueOnce({
      id: 6,
      usuarioId: 10,
      tipo: 'BOLSISTA',
    });
    mockPrisma.solicitacao.update.mockResolvedValueOnce({
      id: 6,
      status: StatusSolicitacao.ACEITA,
    });
    mockPrisma.bolsista.findUnique.mockResolvedValueOnce(null);
    mockPrisma.usuario.update.mockResolvedValueOnce({
      id: 10,
      papel: 'BOLSISTA',
    });

    const res = await service.setStatus(6, StatusSolicitacao.ACEITA, 2);
    expect(mockPrisma.bolsista.create).toHaveBeenCalled();
    expect(mockPrisma.usuario.update).toHaveBeenCalled();
    expect(res).toHaveProperty('status', StatusSolicitacao.ACEITA);
  });

  it('setStatus accepts PROFESSOR and promotes user', async () => {
    mockPrisma.solicitacao.findUnique.mockResolvedValueOnce({
      id: 7,
      usuarioId: 11,
      tipo: 'PROFESSOR',
    });
    mockPrisma.solicitacao.update.mockResolvedValueOnce({
      id: 7,
      status: StatusSolicitacao.ACEITA,
    });
    mockPrisma.professor.findUnique.mockResolvedValueOnce(null);
    mockPrisma.usuario.update.mockResolvedValueOnce({
      id: 11,
      papel: 'PROFESSOR',
    });

    const res = await service.setStatus(7, StatusSolicitacao.ACEITA, 2);
    expect(mockPrisma.professor.create).toHaveBeenCalled();
    expect(mockPrisma.usuario.update).toHaveBeenCalled();
    expect(res).toHaveProperty('status', StatusSolicitacao.ACEITA);
  });

  it('setStatus accepts TECNICO and promotes user', async () => {
    mockPrisma.solicitacao.findUnique.mockResolvedValueOnce({
      id: 8,
      usuarioId: 12,
      tipo: 'TECNICO',
    });
    mockPrisma.solicitacao.update.mockResolvedValueOnce({
      id: 8,
      status: StatusSolicitacao.ACEITA,
    });
    mockPrisma.tecnicoAdministrativo.findUnique.mockResolvedValueOnce(null);
    mockPrisma.usuario.update.mockResolvedValueOnce({
      id: 12,
      papel: 'TECNICO_ADMINISTRATIVO',
    });

    const res = await service.setStatus(8, StatusSolicitacao.ACEITA, 2);
    expect(mockPrisma.tecnicoAdministrativo.create).toHaveBeenCalled();
    expect(mockPrisma.usuario.update).toHaveBeenCalled();
    expect(res).toHaveProperty('status', StatusSolicitacao.ACEITA);
  });
});

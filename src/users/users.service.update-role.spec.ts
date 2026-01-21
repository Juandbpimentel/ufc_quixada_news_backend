import { Test } from '@nestjs/testing';
import { UsuariosService } from './users.service';
import { PrismaService } from '@/prisma/prisma.service';
import { Papel } from '@prisma/client';

describe('UsuariosService.updateRole (extension linkage)', () => {
  let service: UsuariosService;
  const mockPrisma: any = {
    usuario: { update: jest.fn() },
    bolsista: { findUnique: jest.fn(), create: jest.fn() },
    professor: { findUnique: jest.fn(), create: jest.fn() },
    tecnicoAdministrativo: { findUnique: jest.fn(), create: jest.fn() },
    solicitacao: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
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

  it('creates tecnicoAdministrativo record when promoting to TECNICO_ADMINISTRATIVO', async () => {
    mockPrisma.usuario.update.mockResolvedValueOnce({
      id: 7,
      papel: 'TECNICO_ADMINISTRATIVO',
    });
    mockPrisma.tecnicoAdministrativo.findUnique.mockResolvedValueOnce(null);
    mockPrisma.tecnicoAdministrativo.create.mockResolvedValueOnce({
      id: 1,
      usuarioId: 7,
    });

    const res = await service.updateRole(7, Papel.TECNICO_ADMINISTRATIVO);
    expect(mockPrisma.usuario.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: { papel: Papel.TECNICO_ADMINISTRATIVO },
    });
    expect(mockPrisma.tecnicoAdministrativo.create).toHaveBeenCalledWith({
      data: { usuarioId: 7 },
    });
    expect(res).toHaveProperty('id', 7);
  });

  it('creates bolsista record when promoting to BOLSISTA', async () => {
    mockPrisma.usuario.update.mockResolvedValueOnce({
      id: 8,
      papel: 'BOLSISTA',
    });
    mockPrisma.bolsista.findUnique.mockResolvedValueOnce(null);
    mockPrisma.bolsista.create.mockResolvedValueOnce({ id: 2, usuarioId: 8 });

    const res = await service.updateRole(8, Papel.BOLSISTA);
    expect(mockPrisma.bolsista.create).toHaveBeenCalledWith({
      data: { usuarioId: 8 },
    });
    expect(res).toHaveProperty('id', 8);
  });

  it('closes pending solicitation as ACEITA when papel matches solicitation.tipo', async () => {
    mockPrisma.usuario.update.mockResolvedValueOnce({
      id: 9,
      papel: 'BOLSISTA',
    });
    mockPrisma.solicitacao.findUnique.mockResolvedValueOnce({
      id: 11,
      usuarioId: 9,
      status: 'PENDENTE',
      tipo: 'BOLSISTA',
    });
    mockPrisma.solicitacao.update.mockResolvedValueOnce({
      id: 11,
      status: 'ACEITA',
    });

    const res = await service.updateRole(9, Papel.BOLSISTA);
    expect(mockPrisma.solicitacao.findUnique).toHaveBeenCalledWith({
      where: { usuarioId: 9 },
    });
    expect(mockPrisma.solicitacao.update).toHaveBeenCalledWith({
      where: { usuarioId: 9 },
      data: { status: 'ACEITA', aprovadorId: null },
    });
    expect(res).toHaveProperty('id', 9);
  });

  it('removes pending solicitation when papel does not match solicitation.tipo', async () => {
    mockPrisma.usuario.update.mockResolvedValueOnce({
      id: 10,
      papel: 'VISITANTE',
    });
    mockPrisma.solicitacao.findUnique.mockResolvedValueOnce({
      id: 12,
      usuarioId: 10,
      status: 'PENDENTE',
      tipo: 'BOLSISTA',
    });
    mockPrisma.solicitacao.delete.mockResolvedValueOnce({ id: 12 });

    const res = await service.updateRole(10, Papel.VISITANTE);
    expect(mockPrisma.solicitacao.findUnique).toHaveBeenCalledWith({
      where: { usuarioId: 10 },
    });
    expect(mockPrisma.solicitacao.delete).toHaveBeenCalledWith({
      where: { usuarioId: 10 },
    });
    expect(res).toHaveProperty('id', 10);
  });
});

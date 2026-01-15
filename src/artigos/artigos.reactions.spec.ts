import { ArtigosService } from './artigos.service';

describe('ArtigosService - Reactions', () => {
  let svc: ArtigosService;
  const mockPrisma: any = {
    reacao: {
      findFirst: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      groupBy: jest.fn(),
    },
  };
  const mockStorage: any = {};

  beforeEach(() => {
    jest.clearAllMocks();
    svc = new ArtigosService(mockPrisma, mockStorage);
  });

  test('createReaction should create when none exists', async () => {
    mockPrisma.reacao.findFirst.mockResolvedValue(null);
    mockPrisma.reacao.create.mockResolvedValue({ id: 1, tipo: 'CURTIDA' });
    const res = await svc.createReaction(2, 10, 'CURTIDA' as any);
    expect(mockPrisma.reacao.create).toHaveBeenCalledWith({
      data: { usuarioId: 2, artigoId: 10, tipo: 'CURTIDA' },
    });
    expect(res).toBeDefined();
  });

  test('createReaction should update when exists', async () => {
    mockPrisma.reacao.findFirst.mockResolvedValue({ id: 5, tipo: 'CURTIDA' });
    mockPrisma.reacao.update.mockResolvedValue({ id: 5, tipo: 'AMEI' });
    const res = await svc.createReaction(2, 10, 'AMEI' as any);
    expect(mockPrisma.reacao.update).toHaveBeenCalledWith({
      where: { id: 5 },
      data: { tipo: 'AMEI' },
    });
    expect(res).toBeDefined();
  });

  test('deleteReactionByUser should delete when present', async () => {
    mockPrisma.reacao.findFirst.mockResolvedValue({ id: 8 });
    mockPrisma.reacao.delete.mockResolvedValue({});
    const res = await svc.deleteReactionByUser(2, 10);
    expect(res).toEqual({ ok: true });
    expect(mockPrisma.reacao.delete).toHaveBeenCalledWith({ where: { id: 8 } });
  });

  test('getReactionCounts should return grouped counts', async () => {
    mockPrisma.reacao.groupBy.mockResolvedValue([
      { tipo: 'CURTIDA', _count: { tipo: 3 } },
    ]);
    const counts = await svc.getReactionCounts(10);
    expect(counts['CURTIDA']).toBe(3);
  });

  test('getUserReaction returns tipo or null', async () => {
    mockPrisma.reacao.findFirst.mockResolvedValue({ id: 5, tipo: 'AMEI' });
    const t = await svc.getUserReaction(2, 10);
    expect(t).toBe('AMEI');

    mockPrisma.reacao.findFirst.mockResolvedValue(null);
    const n = await svc.getUserReaction(2, 10);
    expect(n).toBeNull();
  });
});

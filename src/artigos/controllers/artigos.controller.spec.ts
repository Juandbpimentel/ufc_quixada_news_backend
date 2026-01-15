import { Test } from '@nestjs/testing';
import { ArtigosController } from '@/artigos/controllers/artigos.controller';
import { ArtigosService } from '@/artigos/artigos.service';

describe('ArtigosController', () => {
  let controller: ArtigosController;
  const mockService: any = {
    listByPage: jest.fn().mockResolvedValue({
      items: [
        {
          id: 1,
          titulo: 'T',
          slug: 't',
          resumo: 'r',
          autorId: 2,
          publicado: true,
          publicadoEm: new Date().toISOString(),
          reacoes: { CURTIDA: 1 },
        },
      ],
      nextCursor: null,
      nextPage: null,
    }),
    listByCursor: jest
      .fn()
      .mockResolvedValue({ items: [], nextCursor: null, nextPage: null }),
    getPublicBySlug: jest.fn().mockResolvedValue({
      id: 1,
      titulo: 'T',
      slug: 't',
      reacoes: { CURTIDA: 1 },
    }),
    getReactionCounts: jest.fn().mockResolvedValue({ CURTIDA: 2 }),
    createReaction: jest.fn().mockResolvedValue({ id: 3, tipo: 'CURTIDA' }),
    deleteReactionByUser: jest.fn().mockResolvedValue({ ok: true }),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ArtigosController],
      providers: [{ provide: ArtigosService, useValue: mockService }],
    }).compile();
    controller = moduleRef.get(ArtigosController);
  });

  afterEach(() => jest.clearAllMocks());

  it('list should return items with reactions', async () => {
    const res = await controller.list('3', undefined, '1');
    expect(res.items[0].reacoes).toBeDefined();
  });

  it('getBySlug returns article with reacoes', async () => {
    const res = await controller.getBySlug('t');
    expect(res.reacoes).toBeDefined();
  });

  it('createReaction delegates to service', async () => {
    const out = await controller.createReaction(
      '1',
      { id: 2 } as any,
      { tipo: 'CURTIDA' } as any,
    );
    expect(mockService.createReaction).toHaveBeenCalled();
  });

  it('deleteOwnReaction returns ok true/false', async () => {
    const out = await controller.deleteOwnReaction('1', { id: 2 } as any);
    expect(out).toEqual({ ok: true });
  });
});

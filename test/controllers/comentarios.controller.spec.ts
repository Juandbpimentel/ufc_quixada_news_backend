import { Test } from '@nestjs/testing';
import { ComentariosController } from '@/artigos/controllers/comentarios.controller';
import { ComentariosService } from '@/artigos/comentarios.service';

describe('ComentariosController', () => {
  let controller: ComentariosController;
  const mockService: any = {
    listByArticle: jest.fn().mockResolvedValue([]),
    create: jest
      .fn()
      .mockResolvedValue({ id: 1, conteudo: 'ok', comentarioPaiId: null }),
    update: jest.fn().mockResolvedValue({ id: 1, conteudo: 'updated' }),
    remove: jest.fn().mockResolvedValue({ ok: true }),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ComentariosController],
      providers: [{ provide: ComentariosService, useValue: mockService }],
    }).compile();
    controller = moduleRef.get(ComentariosController);
  });

  afterEach(() => jest.clearAllMocks());

  it('list returns array', async () => {
    const out = await controller.list(1);
    expect(Array.isArray(out)).toBe(true);
  });

  it('create returns created comment with comentarioPaiId', async () => {
    const res = await controller.create(
      1,
      { id: 2 } as any,
      { conteudo: 'x' } as any,
    );
    expect(res).toHaveProperty('comentarioPaiId');
  });
});

import { ComentariosService } from './comentarios.service';

describe('ComentariosService', () => {
  let svc: ComentariosService;
  const mockPrisma: any = {
    artigo: { findUnique: jest.fn() },
    comentario: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    svc = new ComentariosService(mockPrisma);
  });

  test('listByArticle should return top-level with single-level replies', async () => {
    // three comments in DB originally: A (id=1), B (id=2, parent=1), C (id=3, parent=2)
    // after create logic, replies should be attached to top-level parent (1)
    mockPrisma.comentario.findMany.mockResolvedValueOnce([
      {
        id: 1,
        conteudo: 'A',
        comentarioPaiId: null,
        criadoEm: new Date('2024-01-01'),
        autor: { id: 1, nome: 'A', login: 'a' },
      },
    ]);

    mockPrisma.comentario.findMany.mockResolvedValueOnce([
      {
        id: 2,
        conteudo: 'B',
        comentarioPaiId: 1,
        criadoEm: new Date('2024-01-02'),
        autor: { id: 2, nome: 'B', login: 'b' },
      },
      {
        id: 3,
        conteudo: 'C',
        comentarioPaiId: 1,
        criadoEm: new Date('2024-01-03'),
        autor: { id: 3, nome: 'C', login: 'c' },
      },
    ]);

    const res = await svc.listByArticle(10);
    expect(Array.isArray(res)).toBe(true);
    expect(res.length).toBe(1);
    expect(res[0].respostas.length).toBe(2);
    expect(res[0].respostas[1].id).toBe(3);
  });

  test('create should fail if artigo not found or not published', async () => {
    mockPrisma.artigo.findUnique.mockResolvedValue(null);
    await expect(
      svc.create(1, 10, { conteudo: 'abcdefghij' } as any),
    ).rejects.toThrow();
  });

  test('create should succeed when article published', async () => {
    mockPrisma.artigo.findUnique.mockResolvedValue({ id: 10, publicado: true });
    mockPrisma.comentario.create.mockResolvedValue({
      id: 1,
      conteudo: 'abcdefghij',
    });
    const res = await svc.create(2, 10, { conteudo: 'abcdefghij' } as any);
    expect(res).toBeDefined();
    expect(mockPrisma.comentario.create).toHaveBeenCalled();
  });

  test('create should attach to top-level and set respondeAId when replying to a reply', async () => {
    // setup: article exists
    mockPrisma.artigo.findUnique.mockResolvedValue({ id: 10, publicado: true });
    // parent (pai) is a reply with comentarioPaiId = 1
    mockPrisma.comentario.findUnique
      .mockResolvedValueOnce({ id: 2, artigoId: 10, comentarioPaiId: 1 }) // find pai
      .mockResolvedValueOnce({ id: 1, comentarioPaiId: null }); // walk to top-level parent

    mockPrisma.comentario.create.mockResolvedValue({
      id: 4,
      conteudo: 'reply to reply',
    });

    const res = await svc.create(3, 10, {
      conteudo: 'reply to reply',
      comentarioPaiId: 2,
    } as any);

    expect(mockPrisma.comentario.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ comentarioPaiId: 1, respondeAId: 2 }),
      }),
    );
    expect(res).toBeDefined();
  });

  test('update should allow owner or admin', async () => {
    mockPrisma.comentario.findUnique.mockResolvedValue({ id: 5, usuarioId: 2 });
    mockPrisma.comentario.update.mockResolvedValue({ id: 5, conteudo: 'new' });
    const res = await svc.update(2, 5, { conteudo: 'new' } as any, false);
    expect(res).toBeDefined();
    expect(mockPrisma.comentario.update).toHaveBeenCalledWith({
      where: { id: 5 },
      data: { conteudo: 'new' },
    });
  });

  test('update should deny non-owner non-admin', async () => {
    mockPrisma.comentario.findUnique.mockResolvedValue({ id: 6, usuarioId: 9 });
    await expect(
      svc.update(2, 6, { conteudo: 'x' } as any, false),
    ).rejects.toThrow();
  });

  test('remove should delete when owner or admin', async () => {
    mockPrisma.comentario.findUnique.mockResolvedValue({ id: 7, usuarioId: 3 });
    mockPrisma.comentario.delete.mockResolvedValue({});
    const res = await svc.remove(3, 7, false);
    expect(res).toEqual({ ok: true });
    expect(mockPrisma.comentario.delete).toHaveBeenCalledWith({
      where: { id: 7 },
    });
  });

  test('remove should deny when not owner and not admin', async () => {
    mockPrisma.comentario.findUnique.mockResolvedValue({
      id: 8,
      usuarioId: 10,
    });
    await expect(svc.remove(2, 8, false)).rejects.toThrow();
  });
});

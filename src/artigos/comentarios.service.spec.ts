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

import { Test } from '@nestjs/testing';
import { ArtigosService } from './artigos.service';
import { PrismaService } from '@/prisma/prisma.service';
import { FirebaseStorageService } from '@/storage/firebase-storage.service';
import { BadRequestException } from '@nestjs/common';

describe('ArtigosService', () => {
  let service: ArtigosService;
  const mockPrisma: any = {
    artigo: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    reacao: { groupBy: jest.fn() },
    artigoSessao: { createMany: jest.fn(), deleteMany: jest.fn() },
  };
  const mockStorage: any = {
    isConfigured: jest.fn().mockReturnValue(false),
    uploadBase64: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        ArtigosService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: FirebaseStorageService, useValue: mockStorage },
      ],
    }).compile();
    service = moduleRef.get(ArtigosService);
  });

  afterEach(() => jest.clearAllMocks());

  it('listByPage attaches reacoes', async () => {
    mockPrisma.artigo.findMany.mockResolvedValueOnce([
      {
        id: 1,
        titulo: 'a',
        slug: 'a',
        resumo: '',
        capaUrl: null,
        categoria: 'OUTROS',
        publicado: true,
        publicadoEm: new Date(),
        autorId: 1,
        sessoes: [],
      },
    ]);
    mockPrisma.reacao.groupBy.mockResolvedValueOnce([
      { tipo: 'CURTIDA', _count: { tipo: 3 } },
    ]);

    const res = await service.listByPage({ take: 3 });
    expect(Array.isArray(res.items)).toBe(true);
    expect(res.items[0].reacoes).toEqual({ CURTIDA: 3 });
  });

  it('create throws on invalid title', async () => {
    await expect(
      service.create(1, { titulo: '', resumo: '', conteudo: '' } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('create throws when session has dataURL and storage not configured', async () => {
    mockPrisma.artigo.create.mockResolvedValueOnce({ id: 5 } as any);
    const dto: any = {
      titulo: 'Valid',
      resumo: '',
      artigoSessoes: [
        {
          ordem: 1,
          tipo: 'PARAGRAFO',
          texto: 'x',
          imagemUrl: 'data:image/png;base64,AAA',
        },
      ],
    };
    await expect(service.create(1, dto)).rejects.toThrow(
      'Envie URL pública ou configure o Firebase Storage',
    );
  });

  it('create uploads capa data URL and does not persist base64 in initial create', async () => {
    // storage configured and will return a public URL
    mockStorage.isConfigured.mockReturnValueOnce(true);
    (mockStorage.uploadBase64 as jest.Mock).mockResolvedValueOnce(
      'https://storage.example.com/artigos/10/capa.png',
    );

    // prisma.create should be called first with capaUrl null (not the base64)
    mockPrisma.artigo.create.mockResolvedValueOnce({ id: 10 } as any);
    // update (set uploaded capaUrl) should succeed
    mockPrisma.artigo.update.mockResolvedValueOnce({ id: 10 } as any);
    // first findUnique() is the slug-availability check -> return undefined
    mockPrisma.artigo.findUnique.mockResolvedValueOnce(undefined);
    // second findUnique() (final fetch) -> return the full article
    mockPrisma.artigo.findUnique.mockResolvedValueOnce({
      id: 10,
      sessoes: [],
    } as any);

    const dto: any = {
      titulo: 'Com Capa',
      resumo: '',
      capaUrl: 'data:image/png;base64,AAA',
      artigoSessoes: [],
    };

    const res = await service.create(1, dto);

    expect(res).toBeDefined();
    expect(mockPrisma.artigo.create).toHaveBeenCalled();
    const createPayload = mockPrisma.artigo.create.mock.calls[0][0].data;
    expect(createPayload.capaUrl).toBeNull();

    expect(mockStorage.uploadBase64).toHaveBeenCalledWith(
      dto.capaUrl,
      expect.stringMatching(/artigos\/10\/capa-\d+\.png$/),
    );

    expect(mockPrisma.artigo.update).toHaveBeenCalledWith({
      where: { id: 10 },
      data: { capaUrl: 'https://storage.example.com/artigos/10/capa.png' },
    });

    expect(res).toBeDefined();
  });

  it('update uploads capa data URL and persists storage URL (no base64 in DB)', async () => {
    mockStorage.isConfigured.mockReturnValueOnce(true);
    (mockStorage.uploadBase64 as jest.Mock).mockResolvedValueOnce(
      'https://storage.example.com/artigos/20/capa-updated.png',
    );

    mockPrisma.artigo.findUnique.mockResolvedValueOnce({
      id: 20,
      publicado: false,
      publicadoEm: null,
    } as any);
    mockPrisma.artigo.update.mockResolvedValueOnce({ id: 20 } as any);

    const dto: any = {
      titulo: 'Atualiza Capa',
      resumo: '',
      capaUrl: 'data:image/png;base64,BBB',
      artigoSessoes: [],
    };

    await service.update(20, dto);

    expect(mockStorage.uploadBase64).toHaveBeenCalledWith(
      dto.capaUrl,
      expect.stringMatching(/artigos\/20\/capa-\d+\.png$/),
    );

    const updateCall = mockPrisma.artigo.update.mock.calls[0][0].data;
    expect(updateCall.capaUrl).toBe(
      'https://storage.example.com/artigos/20/capa-updated.png',
    );
  });
});

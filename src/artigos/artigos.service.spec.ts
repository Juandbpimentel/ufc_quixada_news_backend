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
    artigoSessao: { createMany: jest.fn() },
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
});

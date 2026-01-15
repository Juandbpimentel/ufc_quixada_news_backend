import { Test } from '@nestjs/testing';
import { GerenciarArtigosController } from '@/artigos/controllers/gerenciar-artigos.controller';
import { ArtigosService } from '@/artigos/artigos.service';

describe('GerenciarArtigosController', () => {
  let controller: GerenciarArtigosController;
  const mockService: any = {
    listByPage: jest
      .fn()
      .mockResolvedValue({ items: [], nextCursor: null, nextPage: null }),
    listByCursor: jest
      .fn()
      .mockResolvedValue({ items: [], nextCursor: null, nextPage: null }),
    create: jest.fn().mockResolvedValue({ id: 1, titulo: 'X' }),
    update: jest.fn().mockResolvedValue({ id: 1, titulo: 'Updated' }),
    remove: jest.fn().mockResolvedValue({ id: 1 }),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [GerenciarArtigosController],
      providers: [{ provide: ArtigosService, useValue: mockService }],
    }).compile();
    controller = moduleRef.get(GerenciarArtigosController);
  });

  afterEach(() => jest.clearAllMocks());

  it('create calls service', async () => {
    const res = await controller.create(
      { id: 1 } as any,
      { titulo: 'x' } as any,
    );
    expect(mockService.create).toHaveBeenCalled();
  });

  it('update calls service', async () => {
    const res = await controller.update(1, { titulo: 'u' } as any);
    expect(mockService.update).toHaveBeenCalledWith(1, { titulo: 'u' });
  });

  it('remove calls service', async () => {
    await controller.remove(1);
    expect(mockService.remove).toHaveBeenCalledWith(1);
  });
});

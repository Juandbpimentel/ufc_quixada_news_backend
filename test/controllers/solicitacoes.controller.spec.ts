import { Test } from '@nestjs/testing';
import { SolicitacoesController } from '@/users/controllers/solicitacoes.controller';
import { SolicitacoesService } from '@/users/solicitacoes.service';

describe('SolicitacoesController', () => {
  let controller: SolicitacoesController;
  const mockSvc: any = {
    listPendingFor: jest.fn().mockResolvedValue([{ id: 1 }]),
    listOwn: jest.fn().mockResolvedValue([{ id: 2 }]),
    createOrReopenSolicitacao: jest.fn().mockResolvedValue({ id: 3 }),
    getById: jest.fn().mockResolvedValue({ id: 1, tipo: 'BOLSISTA' }),
    setStatus: jest.fn().mockResolvedValue({ id: 1, status: 'ACEITA' }),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [SolicitacoesController],
      providers: [{ provide: SolicitacoesService, useValue: mockSvc }],
    }).compile();
    controller = moduleRef.get(SolicitacoesController);
  });

  afterEach(() => jest.clearAllMocks());

  it('list returns array for approver', async () => {
    const res = await controller.list({
      isAdmin: true,
      papel: 'ADMINISTRADOR',
    } as any);
    expect(Array.isArray(res)).toBe(true);
  });

  it('list returns object for normal user', async () => {
    const res = await controller.list({
      isAdmin: false,
      papel: 'ESTUDANTE',
      id: 2,
    } as any);
    expect(res).toHaveProperty('id');
  });
});

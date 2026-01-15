import { Test } from '@nestjs/testing';
import { SolicitacoesController } from './solicitacoes.controller';
import { SolicitacoesService } from '../solicitacoes.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { StatusSolicitacao } from '@prisma/client';

describe('SolicitacoesController', () => {
  let controller: SolicitacoesController;
  const mockSvc: any = {
    createOrReopenSolicitacao: jest.fn(),
    listOwn: jest.fn(),
    listPendingFor: jest.fn(),
    getById: jest.fn(),
    setStatus: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [SolicitacoesController],
      providers: [{ provide: SolicitacoesService, useValue: mockSvc }],
    }).compile();
    controller = moduleRef.get(SolicitacoesController);
  });

  afterEach(() => jest.clearAllMocks());

  it('create delegates to service with current user', async () => {
    mockSvc.createOrReopenSolicitacao.mockResolvedValueOnce({ id: 1 });
    const res = await controller.create(
      { id: 2 } as any,
      { tipo: 'BOLSISTA' } as any,
    );
    expect(mockSvc.createOrReopenSolicitacao).toHaveBeenCalledWith(
      2,
      expect.any(Object),
    );
    expect(res).toHaveProperty('id', 1);
  });

  it('list returns pending for approver roles', async () => {
    mockSvc.listPendingFor.mockResolvedValueOnce([{ id: 5 }]);
    const admin = { isAdmin: true } as any;
    const res = await controller.list({ id: 9, isAdmin: true } as any);
    expect(res).toEqual([{ id: 5 }]);
  });

  it('list returns own for regular user', async () => {
    mockSvc.listOwn.mockResolvedValueOnce({ id: 6 });
    const res = await controller.list({ id: 6, isAdmin: false } as any);
    expect(res).toEqual({ id: 6 });
  });

  describe('aceitar', () => {
    it('throws NotFound when not exists', async () => {
      mockSvc.getById.mockResolvedValueOnce(null);
      await expect(
        controller.aceitar({ isAdmin: true } as any, 1),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('forbids when user lacks permission for BOLSISTA', async () => {
      mockSvc.getById.mockResolvedValueOnce({ id: 2, tipo: 'BOLSISTA' });
      const user = { isAdmin: false, papel: 'ESTUDANTE' } as any;
      await expect(controller.aceitar(user, 2)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('allows approver to accept and calls setStatus', async () => {
      mockSvc.getById.mockResolvedValueOnce({ id: 3, tipo: 'BOLSISTA' });
      mockSvc.setStatus.mockResolvedValueOnce({
        id: 3,
        status: StatusSolicitacao.ACEITA,
      });
      const res = await controller.aceitar({ isAdmin: true, id: 1 } as any, 3);
      expect(mockSvc.setStatus).toHaveBeenCalledWith(
        3,
        StatusSolicitacao.ACEITA,
        1,
      );
    });
  });

  describe('rejeitar', () => {
    it('throws NotFound when not exists', async () => {
      mockSvc.getById.mockResolvedValueOnce(null);
      await expect(
        controller.rejeitar({ isAdmin: true } as any, 99),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('forbids when user lacks permission for PROFESSOR/TECNICO', async () => {
      mockSvc.getById.mockResolvedValueOnce({ id: 4, tipo: 'PROFESSOR' });
      const user = { isAdmin: false, papel: 'PROFESSOR' } as any; // professor can't reject PROFESSOR
      await expect(controller.rejeitar(user, 4)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('allows admin to reject', async () => {
      mockSvc.getById.mockResolvedValueOnce({ id: 5, tipo: 'PROFESSOR' });
      mockSvc.setStatus.mockResolvedValueOnce({
        id: 5,
        status: StatusSolicitacao.REJEITADA,
      });
      const res = await controller.rejeitar({ isAdmin: true, id: 1 } as any, 5);
      expect(mockSvc.setStatus).toHaveBeenCalledWith(
        5,
        StatusSolicitacao.REJEITADA,
        1,
      );
    });
  });
});

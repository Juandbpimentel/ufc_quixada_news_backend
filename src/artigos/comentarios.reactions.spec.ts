import { Test } from '@nestjs/testing'
import { ComentariosService } from './comentarios.service'
import { PrismaService } from '@/prisma/prisma.service'

describe('ComentariosService reactions', () => {
  let svc: ComentariosService
  const mockPrisma: any = {
    comentario: { findUnique: jest.fn() },
    comentarioReacao: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      groupBy: jest.fn(),
      findUnique: jest.fn(),
    },
  }

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [ComentariosService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile()

    svc = module.get(ComentariosService)
    jest.clearAllMocks()
  })

  test('createCommentReaction should create when none exists', async () => {
    mockPrisma.comentario.findUnique = jest.fn().mockResolvedValue({ id: 10 })
    mockPrisma.comentarioReacao.findFirst.mockResolvedValue(null)
    mockPrisma.comentarioReacao.create.mockResolvedValue({ id: 1, tipo: 'GOSTEI' })
    const res = await svc.createCommentReaction(2, 10, 'GOSTEI' as any)
    expect(mockPrisma.comentarioReacao.create).toHaveBeenCalledWith({ data: { usuarioId: 2, comentarioId: 10, tipo: 'GOSTEI' } })
    expect(res).toEqual({ id: 1, tipo: 'GOSTEI' })
  })

  test('createCommentReaction should throw NotFound when comment does not exist', async () => {
    mockPrisma.comentario.findUnique = jest.fn().mockResolvedValue(null)
    await expect(svc.createCommentReaction(2, 999, 'GOSTEI' as any)).rejects.toThrow('Comentário não encontrado')
  })

  test('createCommentReaction should update when exists', async () => {
    mockPrisma.comentario.findUnique = jest.fn().mockResolvedValue({ id: 10 })
    mockPrisma.comentarioReacao.findFirst.mockResolvedValue({ id: 5, tipo: 'GOSTEI' })
    mockPrisma.comentarioReacao.update.mockResolvedValue({ id: 5, tipo: 'NAO_GOSTEI' })
    const res = await svc.createCommentReaction(2, 10, 'NAO_GOSTEI' as any)
    expect(mockPrisma.comentarioReacao.update).toHaveBeenCalledWith({ where: { id: 5 }, data: { tipo: 'NAO_GOSTEI' } })
    expect(res).toEqual({ id: 5, tipo: 'NAO_GOSTEI' })
  })

  test('deleteCommentReactionByUser should delete when present', async () => {
    mockPrisma.comentarioReacao.findFirst.mockResolvedValue({ id: 8 })
    mockPrisma.comentarioReacao.delete.mockResolvedValue({})
    const res = await svc.deleteCommentReactionByUser(2, 10)
    expect(mockPrisma.comentarioReacao.delete).toHaveBeenCalledWith({ where: { id: 8 } })
    expect(res).toEqual({ ok: true })
  })

  test('getCommentReactionCounts should return grouped counts', async () => {
    mockPrisma.comentarioReacao.groupBy.mockResolvedValue([
      { tipo: 'GOSTEI', _count: { tipo: 3 } },
      { tipo: 'NAO_GOSTEI', _count: { tipo: 1 } },
    ])
    const counts = await svc.getCommentReactionCounts(10)
    expect(counts).toEqual({ GOSTEI: 3, NAO_GOSTEI: 1 })
  })

  test('getUserCommentReactionRecord returns record when present', async () => {
    mockPrisma.comentarioReacao.findFirst.mockResolvedValue({ id: 5, tipo: 'GOSTEI' })
    const r = await svc.getUserCommentReactionRecord(2, 10)
    expect(r).toEqual({ id: 5, tipo: 'GOSTEI' })
  })

  test('deleteCommentReaction should call delete', async () => {
    mockPrisma.comentarioReacao.delete.mockResolvedValue({})
    await svc.deleteCommentReaction(7)
    expect(mockPrisma.comentarioReacao.delete).toHaveBeenCalledWith({ where: { id: 7 } })
  })
})
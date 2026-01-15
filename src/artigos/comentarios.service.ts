import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CriarComentarioDto } from './dtos/criar-comentario.dto';
import { AtualizarComentarioDto } from './dtos/atualizar-comentario.dto';

@Injectable()
export class ComentariosService {
  constructor(private readonly prisma: PrismaService) {}

  async create(usuarioId: number, artigoId: number, dto: CriarComentarioDto) {
    // verifica se o artigo existe e está publicado
    const artigo = await this.prisma.artigo.findUnique({
      where: { id: artigoId },
      select: { id: true, publicado: true },
    });
    if (!artigo || !artigo.publicado)
      throw new NotFoundException('Artigo não encontrado ou não publicado');

    let topParentId: number | null = null;
    let respondeAId: number | null = null;
    if (dto.comentarioPaiId) {
      const pai = await this.prisma.comentario.findUnique({
        where: { id: dto.comentarioPaiId },
        select: { id: true, artigoId: true, comentarioPaiId: true },
      });
      if (!pai || pai.artigoId !== artigoId)
        throw new NotFoundException('Comentário pai inválido');

      // determine top-level parent and respondeAId
      if (!pai.comentarioPaiId) {
        // replying to a top-level comment
        topParentId = pai.id;
        respondeAId = pai.id;
      } else {
        // replying to a reply: attach to top-level parent and set respondeAId to the immediate parent
        let current = pai as any;
        while (current.comentarioPaiId) {
          const ancestor = await this.prisma.comentario.findUnique({
            where: { id: current.comentarioPaiId },
            select: { id: true, comentarioPaiId: true },
          });
          if (!ancestor) throw new NotFoundException('Comentário pai inválido');
          current = ancestor;
        }
        topParentId = current.id;
        respondeAId = pai.id;
      }
    }

    const comentario = await this.prisma.comentario.create({
      data: {
        conteudo: dto.conteudo,
        autorId: usuarioId,
        usuarioId: usuarioId,
        artigoId,
        comentarioPaiId: topParentId ?? dto.comentarioPaiId ?? null,
        respondeAId: respondeAId ?? null,
      },
      include: {
        autor: { select: { id: true, nome: true, login: true } },
      },
    });

    return comentario;
  }

  async listByArticle(artigoId: number) {
    // return top-level comments with a single level of replies (flatten deeper replies to top-level parent)
    // fetch top-level comments
    const roots = await this.prisma.comentario.findMany({
      where: { artigoId, comentarioPaiId: null },
      include: {
        autor: { select: { id: true, nome: true, login: true } },
      },
      orderBy: { criadoEm: 'desc' },
    });

    // fetch all replies that point to a top-level parent
    const replies = await this.prisma.comentario.findMany({
      where: { artigoId, NOT: { comentarioPaiId: null } },
      include: { autor: { select: { id: true, nome: true, login: true } } },
      orderBy: { criadoEm: 'asc' },
    });

    // group replies by their top-level parent (comentarioPaiId points to top-level parent due to create logic)
    const grouped: Record<number, any[]> = {};
    replies.forEach((r) => {
      const parentId = r.comentarioPaiId as number;
      if (!grouped[parentId]) grouped[parentId] = [];
      grouped[parentId].push(r);
    });

    // attach replies to roots
    const result = roots.map((root) => ({
      ...root,
      respostas: grouped[root.id] || [],
    }));

    return result;
  }

  async getById(id: number) {
    const comentario = await this.prisma.comentario.findUnique({
      where: { id },
      include: {
        autor: { select: { id: true, nome: true, login: true } },
        respostas: {
          include: { autor: { select: { id: true, nome: true, login: true } } },
        },
      },
    });
    if (!comentario) throw new NotFoundException('Comentário não encontrado');
    return comentario;
  }

  async update(
    usuarioId: number,
    id: number,
    dto: AtualizarComentarioDto,
    isAdmin = false,
  ) {
    const comentario = await this.prisma.comentario.findUnique({
      where: { id },
    });
    if (!comentario) throw new NotFoundException('Comentário não encontrado');
    if (comentario.usuarioId !== usuarioId && !isAdmin)
      throw new ForbiddenException('Sem permissão para editar este comentário');

    return await this.prisma.comentario.update({
      where: { id },
      data: { conteudo: dto.conteudo },
    });
  }

  async remove(usuarioId: number, id: number, isAdmin = false) {
    const comentario = await this.prisma.comentario.findUnique({
      where: { id },
    });
    if (!comentario) return { ok: false };
    if (comentario.usuarioId !== usuarioId && !isAdmin)
      throw new ForbiddenException(
        'Sem permissão para remover este comentário',
      );

    await this.prisma.comentario.delete({ where: { id } });
    return { ok: true };
  }

  // Comment reactions
  async createCommentReaction(usuarioId: number, comentarioId: number, tipo: any) {
    // ensure comment exists to avoid foreign key errors and provide clearer 404
    const comment = await this.prisma.comentario.findUnique({ where: { id: comentarioId }, select: { id: true } });
    if (!comment) throw new NotFoundException('Comentário não encontrado');

    const existing = await this.prisma.comentarioReacao.findFirst({ where: { usuarioId, comentarioId } });
    if (existing) {
      return this.prisma.comentarioReacao.update({ where: { id: existing.id }, data: { tipo } });
    }
    return this.prisma.comentarioReacao.create({ data: { usuarioId, comentarioId, tipo } });
  }

  async deleteCommentReactionByUser(usuarioId: number, comentarioId: number) {
    const r = await this.prisma.comentarioReacao.findFirst({ where: { usuarioId, comentarioId } });
    if (!r) return { ok: false };
    await this.prisma.comentarioReacao.delete({ where: { id: r.id } });
    return { ok: true };
  }

  async getCommentReactionCounts(comentarioId: number) {
    const groups = await this.prisma.comentarioReacao.groupBy({
      by: ['tipo'],
      where: { comentarioId },
      _count: { tipo: true },
    });
    const result: Record<string, number> = {};
    for (const g of groups) result[g.tipo] = (g as any)._count.tipo;
    return result;
  }

  async getUserCommentReactionRecord(usuarioId: number, comentarioId: number) {
    const r = await this.prisma.comentarioReacao.findFirst({ where: { usuarioId, comentarioId } });
    if (!r) return null;
    return { id: r.id, tipo: r.tipo };
  }

  async getCommentReactionById(reacaoId: number) {
    return this.prisma.comentarioReacao.findUnique({ where: { id: reacaoId } });
  }

  async deleteCommentReaction(reacaoId: number) {
    return this.prisma.comentarioReacao.delete({ where: { id: reacaoId } });
  }
}

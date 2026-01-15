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

    if (dto.comentarioPaiId) {
      const pai = await this.prisma.comentario.findUnique({
        where: { id: dto.comentarioPaiId },
        select: { id: true, artigoId: true },
      });
      if (!pai || pai.artigoId !== artigoId)
        throw new NotFoundException('Comentário pai inválido');
    }

    const comentario = await this.prisma.comentario.create({
      data: {
        conteudo: dto.conteudo,
        autorId: usuarioId,
        usuarioId: usuarioId,
        artigoId,
        comentarioPaiId: dto.comentarioPaiId ?? null,
      },
      include: {
        autor: { select: { id: true, nome: true, login: true } },
      },
    });

    return comentario;
  }

  async listByArticle(artigoId: number) {
    // lista apenas comentários de primeiro nível e inclui respostas
    return await this.prisma.comentario.findMany({
      where: { artigoId, comentarioPaiId: null },
      include: {
        autor: { select: { id: true, nome: true, login: true } },
        respostas: {
          include: { autor: { select: { id: true, nome: true, login: true } } },
          orderBy: { criadoEm: 'asc' },
        },
      },
      orderBy: { criadoEm: 'desc' },
    });
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
}
